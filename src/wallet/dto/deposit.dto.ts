import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';

export class DepositDto {
  @ApiProperty({ example: 100.50 })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'Salary deposit', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
