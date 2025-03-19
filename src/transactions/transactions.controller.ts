import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReverseTransactionDto } from './dto/reverse-transaction.dto'

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all transactions for current user' })
  @ApiResponse({ status: 200, description: 'List of transactions retrieved successfully' })
  findAllByUser(@Request() req) {
    return this.transactionsService.findAllByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  findOne(@Param('id') id: string) {
    return this.transactionsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reverse')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reverse a transaction' })
  @ApiResponse({ status: 201, description: 'Transaction reversed successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  reverseTransaction(
    @Param('id') id: string,
    @Body() reverseTransactionDto: ReverseTransactionDto,
  ) {
    return this.transactionsService.reverseTransaction(id, reverseTransactionDto);
  }
}
