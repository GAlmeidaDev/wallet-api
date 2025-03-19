import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

describe('WalletAPI (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let userId: string;
  let recipientEmail = 'recipient@example.com';
  let transactionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a new user', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123',
      })
      .expect(201)
      .then(response => {
        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toBe('test@example.com');
        userId = response.body.id;
      });
  });

  it('should register a recipient user', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: recipientEmail,
        name: 'Recipient User',
        password: 'Password123',
      })
      .expect(201);
  });

  it('should login and get JWT token', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123',
      })
      .expect(200)
      .then(response => {
        expect(response.body).toHaveProperty('access_token');
        jwtToken = response.body.access_token;
      });
  });

  it('should get user profile', () => {
    return request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200)
      .then(response => {
        expect(response.body.email).toBe('test@example.com');
      });
  });

  it('should get wallet balance', () => {
    return request(app.getHttpServer())
      .get('/wallet/balance')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200)
      .then(response => {
        expect(response.body).toHaveProperty('balance');
        expect(response.body.balance).toBe(0);
      });
  });

  it('should deposit money into wallet', () => {
    return request(app.getHttpServer())
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        amount: 100,
        description: 'Initial deposit',
      })
      .expect(201)
      .then(response => {
        expect(response.body).toHaveProperty('id');
        expect(response.body.amount).toBe(100);
        expect(response.body.type).toBe('deposit');
        expect(response.body.status).toBe('completed');
      });
  });

  it('should get updated wallet balance after deposit', () => {
    return request(app.getHttpServer())
      .get('/wallet/balance')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200)
      .then(response => {
        expect(response.body.balance).toBe(100);
      });
  });

  it('should transfer money to another user', () => {
    return request(app.getHttpServer())
      .post('/wallet/transfer')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        recipientEmail: recipientEmail,
        amount: 50,
        description: 'Test transfer',
      })
      .expect(201)
      .then(response => {
        expect(response.body).toHaveProperty('id');
        expect(response.body.amount).toBe(50);
        expect(response.body.type).toBe('transfer');
        expect(response.body.status).toBe('completed');
        transactionId = response.body.id;
      });
  });

  it('should get transactions list', () => {
    return request(app.getHttpServer())
      .get('/transactions')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200)
      .then(response => {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });
  });

  it('should get specific transaction', () => {
    return request(app.getHttpServer())
      .get(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200)
      .then(response => {
        expect(response.body.id).toBe(transactionId);
      });
  });

  it('should reverse a transaction', () => {
    return request(app.getHttpServer())
      .post(`/transactions/${transactionId}/reverse`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        reason: 'Test reversal',
      })
      .expect(201)
      .then(response => {
        expect(response.body).toHaveProperty('id');
        expect(response.body.type).toBe('reversal');
        expect(response.body.status).toBe('completed');
        expect(response.body.relatedTransactionId).toBe(transactionId);
      });
  });

  it('should fail to withdraw more than available balance', () => {
    return request(app.getHttpServer())
      .post('/wallet/transfer')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        recipientEmail: recipientEmail,
        amount: 1000,
        description: 'Should fail',
      })
      .expect(400);
  });
});