import { FastifyInstance } from "fastify";
import { z } from "zod";
import { knex } from "../database";
import { randomUUID } from "crypto";
import { checkSessionIdExists } from "../middlewares/check-session-id-exists";

export async function transactionsRoutes(app: FastifyInstance) {
    app.get('/', {
        preHandler: [checkSessionIdExists]
    }, async (request,reply) => {
        const { sessionId } = request.cookies;

        const transactions = await knex('transactions').where('session_id', sessionId).select('*');
        return reply.status(200).send({ transactions });
    })

    app.get('/:id', {
        preHandler: [checkSessionIdExists]
    }, async (request,reply) => {
        const getTransactionParamsSchema = z.object({
            id: z.string().uuid(),
        })
        const { id } = getTransactionParamsSchema.parse(request.params);

        const { sessionId } = request.cookies;

        const transaction = await knex('transactions').where({
            session_id: sessionId,
            id
        }).first();
        return reply.status(200).send({ transaction });
    })

    app.get('/summary', {
        preHandler: [checkSessionIdExists]
    }, async (request) => {
        const { sessionId } = request.cookies;
        const summary = await knex('transactions').sum('amount', {as: 'amount'}).where('session_id', sessionId).first();
        return { summary }
    })

    app.post('/', async (request,reply) => {
        const createTransactionBodySchema = z.object({
            title: z.string(),
            amount: z.number(),
            type: z.enum(['credit','debit']),
        })
        const { title, amount, type } = createTransactionBodySchema.parse(request.body);

        let sessionId = request.cookies.sessionId;
        if(!sessionId) {
            sessionId = randomUUID();
            reply.cookie('sessionId', sessionId, {
                path: '/',
                maxAge: 60 * 60, //1 hour
            })
        }

        await knex('transactions').insert({
            id: randomUUID(),
            title,
            amount: type === 'credit' ? amount : amount * -1,
            session_id: sessionId,
        })

        return reply.status(201).send({message: 'Transação realizada com sucesso'});
    })
}