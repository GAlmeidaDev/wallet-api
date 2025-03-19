import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { DepositDto } from './dto/deposit.dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createWalletDto: CreateWalletDto): Promise<Wallet> {
    try {
      const wallet = this.walletRepository.create(createWalletDto);
      return await this.walletRepository.save(wallet);
    } catch (error) {
      this.logger.error(`Error creating wallet: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<Wallet> {
    try {
      const wallet = await this.walletRepository.findOne({
        where: { userId, isActive: true },
      });

      if (!wallet) {
        throw new NotFoundException(`Wallet for user ${userId} not found`);
      }

      return wallet;
    } catch (error) {
      this.logger.error(`Error finding wallet by user ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<Wallet> {
    try {
      const wallet = await this.walletRepository.findOne({
        where: { id, isActive: true },
      });

      if (!wallet) {
        throw new NotFoundException(`Wallet with ID ${id} not found`);
      }

      return wallet;
    } catch (error) {
      this.logger.error(`Error finding wallet by ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateBalance(walletId: string, amount: number): Promise<Wallet> {
    try {
      const wallet = await this.findById(walletId);
      
      if (!wallet.isActive) {
        throw new BadRequestException('Wallet is not active');
      }

      const newBalance = Number(wallet.balance) + amount;
      if (amount < 0 && newBalance < 0) {
        throw new BadRequestException('Insufficient funds');
      }
      

      if (Number(wallet.balance) < 0 && amount > 0) {
        throw new BadRequestException('Cannot deposit funds due to negative balance issue');
      }
      
      wallet.balance = newBalance;
      return await this.walletRepository.save(wallet);
    } catch (error) {
      this.logger.error(`Error updating balance: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getBalance(userId: string): Promise<{ balance: number }> {
    try {
      const wallet = await this.findByUserId(userId);
      return { balance: Number(wallet.balance) };
    } catch (error) {
      this.logger.error(`Error getting balance: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deactivateWallet(walletId: string): Promise<void> {
    try {
      const wallet = await this.findById(walletId);
      wallet.isActive = false;
      await this.walletRepository.save(wallet);
    } catch (error) {
      this.logger.error(`Error deactivating wallet: ${error.message}`, error.stack);
      throw error;
    }
  }
}
