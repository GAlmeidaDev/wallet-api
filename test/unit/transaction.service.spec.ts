import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TransactionsService } from '../../src/transactions/transactions.service';
import { Transaction, TransactionType, TransactionStatus } from '../../src/transactions/entities/transaction.entity';
import { WalletService } from '../../src/wallet/wallet.service';
import { UsersService } from '../../src/users/users.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    save: jest.fn(),
  },
};

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
};

const mockUser = {
  id: 'user-id',
  email: 'test@example.com',
  name: 'Test User',
};

const mockRecipient = {
  id: 'recipient-id',
  email: 'recipient@example.com',
  name: 'Recipient User',
};

const mockWallet = {
  id: 'wallet-id',
  balance: 100,
  userId: 'user-id',
};

const mockRecipientWallet = {
  id: 'recipient-wallet-id',
  balance: 50,
  userId: 'recipient-id',
};

const mockTransaction = {
  id: 'transaction-id',
  type: TransactionType.TRANSFER,
  amount: 50,
  status: TransactionStatus.COMPLETED,
  senderId: 'user-id',
  sender: mockUser,
  receiverId: 'recipient-id',
  receiver: mockRecipient,
};

describe('TransactionsService', () => {
  let service: TransactionsService;
  let repository: Repository<Transaction>;
  let walletService: WalletService;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            create: jest.fn().mockImplementation(dto => dto),
            save: jest.fn().mockImplementation(transaction => 
              Promise.resolve({ id: 'transaction-id', ...transaction })),
            find: jest.fn().mockResolvedValue([mockTransaction]),
            findOne: jest.fn().mockResolvedValue(mockTransaction),
          },
        },
        {
          provide: WalletService,
          useValue: {
            findByUserId: jest.fn().mockImplementation(id => {
              if (id === 'user-id') return Promise.resolve(mockWallet);
              if (id === 'recipient-id') return Promise.resolve(mockRecipientWallet);
              return Promise.reject(new NotFoundException());
            }),
            updateBalance: jest.fn().mockImplementation((id, amount) => {
              if (id === 'wallet-id') {
                return Promise.resolve({ ...mockWallet, balance: mockWallet.balance + amount });
              }
              if (id === 'recipient-wallet-id') {
                return Promise.resolve({ ...mockRecipientWallet, balance: mockRecipientWallet.balance + amount });
              }
              return Promise.reject(new NotFoundException());
            }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockImplementation(id => {
              if (id === 'user-id') return Promise.resolve(mockUser);
              if (id === 'recipient-id') return Promise.resolve(mockRecipient);
              return Promise.reject(new NotFoundException());
            }),
            findByEmail: jest.fn().mockImplementation(email => {
              if (email === 'recipient@example.com') return Promise.resolve(mockRecipient);
              return Promise.reject(new NotFoundException());
            }),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    repository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    walletService = module.get<WalletService>(WalletService);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDeposit', () => {
    it('should create a deposit transaction successfully', async () => {
      const depositDto = { amount: 50, description: 'Test deposit' };
      
      const result = await service.createDeposit('user-id', depositDto);
      
      expect(result).toHaveProperty('id');
      expect(result.type).toBe(TransactionType.DEPOSIT);
      expect(result.amount).toBe(50);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(expect.objectContaining({
        type: TransactionType.DEPOSIT,
        amount: 50,
        description: 'Test deposit',
        senderId: 'user-id',
        sender: mockUser,
        status: TransactionStatus.PENDING,
      }));
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw an error if user not found', async () => {
      const depositDto = { amount: 50, description: 'Test deposit' };
      
      await expect(service.createDeposit('invalid-user-id', depositDto)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('createTransfer', () => {    
    it('should create a transfer transaction', async () => {
      const depositDto = { amount: 50, description: 'Test deposit' };
      
      await service.createTransfer('user-id', depositDto as any);

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(expect.objectContaining({
        type: TransactionType.TRANSFER,
        amount: 50,
        description: 'Test deposit',
        senderId: 'user-id',        
        sender: mockUser,
        receiverId: 'recipient-id',
        receiver: mockRecipient,
        status: TransactionStatus.PENDING,
      }));
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw an error if sender not found', async () => {
      const depositDto = { amount: 50, description: 'Test deposit' };
      
      await expect(service.createTransfer('invalid-user-id', depositDto as any)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should throw an error if recipient not found', async () => {
      const depositDto = { amount: 50, description: 'Test deposit' };
      
      await expect(service.createTransfer('user-id', depositDto as any)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should throw an error if insufficient funds', async () => {
      const depositDto = { amount: 100, description: 'Test deposit' };
      
      await expect(service.createTransfer('user-id', depositDto as any)).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('reverseTransaction', () => {
    it('should reverse a transaction', async () => {
      const reversalDto = { reason: 'Test reversal' };
      
      await service.reverseTransaction('transaction-id', reversalDto);

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(expect.objectContaining({
        type: TransactionType.REVERSAL,
        amount: 50,
        description: 'Test deposit',
        senderId: 'user-id',        
        sender: mockUser,
        receiverId: 'recipient-id',
        receiver: mockRecipient,
        status: TransactionStatus.PENDING,
        relatedTransactionId: 'transaction-id',
      }));
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw an error if transaction not found', async () => {
      const reversalDto = { reason: 'Test reversal' };
      
      await expect(service.reverseTransaction('invalid-transaction-id', reversalDto)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('findAllByUser', () => {
    it('should find all transactions by user', async () => {
      const result = await service.findAllByUser('user-id');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0].type).toBe(TransactionType.TRANSFER);
      expect(result[0].amount).toBe(50);
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should throw an error if user not found', async () => {
      const result = await service.findAllByUser('invalid-user-id');
      
      expect(result).toHaveLength(0);
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });
});      