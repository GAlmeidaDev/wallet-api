import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsOptional, IsString, IsEmail } from 'class-validator';

export class TransferDto {
  @ApiProperty({ example: 'recipient@example.com' })
  @IsNotEmpty()
  @IsEmail()
  recipientEmail: string;

  @ApiProperty({ example: 50.25 })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'Payment for dinner', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}