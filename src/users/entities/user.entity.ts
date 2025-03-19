import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  OneToOne, 
  OneToMany, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToOne(() => Wallet, wallet => wallet.user, { cascade: true })
  wallet: Wallet;

  @OneToMany(() => Transaction, transaction => transaction.sender)
  sentTransactions: Transaction[];

  @OneToMany(() => Transaction, transaction => transaction.receiver)
  receivedTransactions: Transaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}