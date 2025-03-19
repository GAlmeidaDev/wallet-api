import { 
  Injectable, 
  BadRequestException, 
  NotFoundException, 
  Logger,
  Inject,
  forwardRef
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';
import { WalletService } from '../wallet/wallet.service';
import { UsersService } from '../users/users.service';
import { DepositDto } from '../wallet/dto/deposit.dto';
import { TransferDto } from '../wallet/dto/transfer.dto';
import { ReverseTransactionDto } from './dto/reverse-transaction.dto';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: WalletService,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async createDeposit(userId: string, depositDto: DepositDto): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.usersService.findById(userId);
      const wallet = await this.walletService.findByUserId(userId);

      const transaction = this.transactionRepository.create({
        type: TransactionType.DEPOSIT,
        amount: depositDto.amount,
        description: depositDto.description || 'Deposit',
        receiverId: userId,
        receiver: user,
        status: TransactionStatus.PENDING,
      });

      const savedTransaction = await queryRunner.manager.save(transaction);

      const updatedWallet = await this.walletService.updateBalance(
        wallet.id,
        depositDto.amount,
      );

      savedTransaction.status = TransactionStatus.COMPLETED;
      await queryRunner.manager.save(savedTransaction);

      await queryRunner.commitTransaction();

      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error creating deposit: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createTransfer(senderId: string, transferDto: TransferDto): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sender = await this.usersService.findById(senderId);
      const senderWallet = await this.walletService.findByUserId(senderId);

      const recipient = await this.usersService.findByEmail(transferDto.recipientEmail);
      const recipientWallet = await this.walletService.findByUserId(recipient.id);

      if (Number(senderWallet.balance) < transferDto.amount) {
        throw new BadRequestException('Insufficient funds for transfer');
      }

      const transaction = this.transactionRepository.create({
        type: TransactionType.TRANSFER,
        amount: transferDto.amount,
        description: transferDto.description || 'Transfer',
        senderId: senderId,
        sender: sender,
        receiverId: recipient.id,
        receiver: recipient,
        status: TransactionStatus.PENDING,
      });

      const savedTransaction = await queryRunner.manager.save(transaction);

      await this.walletService.updateBalance(
        senderWallet.id,
        -transferDto.amount,
      );

      await this.walletService.updateBalance(
        recipientWallet.id,
        transferDto.amount,
      );

      savedTransaction.status = TransactionStatus.COMPLETED;
      await queryRunner.manager.save(savedTransaction);

      await queryRunner.commitTransaction();

      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error creating transfer: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async reverseTransaction(transactionId: string, reverseDto: ReverseTransactionDto): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = await this.transactionRepository.findOne({
        where: { id: transactionId },
        relations: ['sender', 'receiver'],
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
      }

      if (transaction.status === TransactionStatus.REVERSED) {
        throw new BadRequestException('Transaction has already been reversed');
      }

      if (transaction.status !== TransactionStatus.COMPLETED) {
        throw new BadRequestException('Only completed transactions can be reversed');
      }

      const reversalTransaction = this.transactionRepository.create({
        type: TransactionType.REVERSAL,
        amount: transaction.amount,
        description: reverseDto.reason || 'Transaction reversed',
        senderId: transaction.receiverId,
        sender: transaction.receiver,
        receiverId: transaction.senderId,
        receiver: transaction.sender,
        status: TransactionStatus.PENDING,
        relatedTransactionId: transaction.id,
      });

      const savedReversal = await queryRunner.manager.save(reversalTransaction);
      
      const amount = parseFloat(String(transaction.amount));
      if (isNaN(amount)) {
          throw new Error(`Invalid transaction amount: ${transaction.amount}`);
      }
      
      if (transaction.type === TransactionType.DEPOSIT) {
        const wallet = await this.walletService.findByUserId(transaction.receiverId);
        await this.walletService.updateBalance(wallet.id, -amount);
      } else if (transaction.type === TransactionType.TRANSFER) {
        const senderWallet = await this.walletService.findByUserId(transaction.senderId);
        const receiverWallet = await this.walletService.findByUserId(transaction.receiverId);

        await this.walletService.updateBalance(senderWallet.id, amount);
        await this.walletService.updateBalance(receiverWallet.id, -amount);
      }

      transaction.status = TransactionStatus.REVERSED;
      await queryRunner.manager.save(transaction);

      savedReversal.status = TransactionStatus.COMPLETED;
      await queryRunner.manager.save(savedReversal);

      await queryRunner.commitTransaction();

      return savedReversal;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error reversing transaction: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllByUser(userId: string): Promise<Transaction[]> {
    try {
      return await this.transactionRepository.find({
        where: [
          { senderId: userId },
          { receiverId: userId },
        ],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error finding transactions by user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<Transaction> {
    try {
      const transaction = await this.transactionRepository.findOne({
        where: { id },
        relations: ['sender', 'receiver'],
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction with ID ${id} not found`);
      }

      return transaction;
    } catch (error) {
      this.logger.error(`Error finding transaction by ID: ${error.message}`, error.stack);
      throw error;
    }
  }
}