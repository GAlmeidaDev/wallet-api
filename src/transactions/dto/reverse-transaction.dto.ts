import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReverseTransactionDto {
  @ApiProperty({ example: 'Customer request' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}