import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionsService } from '../transactions/transactions.service';
import { DepositDto } from './dto/deposit.dto';
import { TransferDto } from './dto/transfer.dto';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('balance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user wallet balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  async getBalance(@Request() req) {
    return this.walletService.getBalance(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('deposit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deposit money into wallet' })
  @ApiResponse({ status: 201, description: 'Deposit completed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async deposit(@Request() req, @Body() depositDto: DepositDto) {
    return this.transactionsService.createDeposit(req.user.id, depositDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('transfer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Transfer money to another user' })
  @ApiResponse({ status: 201, description: 'Transfer completed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Recipient not found' })
  async transfer(@Request() req, @Body() transferDto: TransferDto) {
    return this.transactionsService.createTransfer(req.user.id, transferDto);
  }
}