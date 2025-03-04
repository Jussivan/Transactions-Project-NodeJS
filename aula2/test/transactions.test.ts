import { expect, test, beforeAll, afterAll, describe, beforeEach} from 'vitest';
import { execSync } from 'node:child_process';
import request from 'supertest';
import { app } from '../src/app';
import { ChildProcess } from 'child_process';

describe('Transactions Routes', () => {
    beforeEach(() => {
        execSync('npm run migrate:rollback');
        execSync('npm run migrate');
    })

    beforeAll(async() => {
        await app.ready();
    })
    
    afterAll(async() => {
        await app.close();
    })
    
    test('Criar Transação', async () => {
        const response = await request(app.server).post('/transactions').send({
            title: 'Transaction Test',
            amount: 27,
            type: 'debit', 
        })
        expect(response.statusCode).toEqual(201);
    })

    test('Listar Transações', async () => {
        const createTransactionResponse = await request(app.server).post('/transactions').send({
            title: 'Transaction Test',
            amount: 27,
            type: 'credit', 
        })

        const cookies = createTransactionResponse.get('Set-Cookie');
        const listTransactionsResponse = await request(app.server).get('/transactions').set('Cookie', cookies as string[]).expect(200);

        expect(listTransactionsResponse.body.transactions).toEqual([
            expect.objectContaining({
                title: 'Transaction Test',
                amount: 27,
            }),
        ])
    })

    test('Listar Transação Específica', async () => {
        const createTransactionResponse = await request(app.server).post('/transactions').send({
            title: 'Transaction Test',
            amount: 27,
            type: 'credit', 
        })

        const cookies = createTransactionResponse.get('Set-Cookie');
        const listTransactionsResponse = await request(app.server).get('/transactions').set('Cookie', cookies as string[]).expect(200);

        const transactionId = listTransactionsResponse.body.transactions[0].id;
        const getTransactionResponse = await request(app.server).get(`/transactions/${transactionId}`).set('Cookie', cookies as string[]).expect(200);

        expect(getTransactionResponse.body.transaction).toEqual(
            expect.objectContaining({
                title: 'Transaction Test',
                amount: 27,
            }),
        )
    })

    test('Gerar Resumo', async () => {
        const createTransactionResponse = await request(app.server).post('/transactions').send({
            title: 'Transaction Test',
            amount: 5000,
            type: 'credit', 
        })

        const cookies = createTransactionResponse.get('Set-Cookie');

        await request(app.server).post('/transactions').set('Cookie', cookies as string[]).send({
            title: 'Transaction Test 2',
            amount: 2000,
            type: 'debit', 
        })

        const summaryResponse = await request(app.server).get('/transactions/qsummary').set('Cookie', cookies as string[]).expect(200);

        expect(summaryResponse.body.summary).toEqual({
            amount: 3000,
        })
    })
})