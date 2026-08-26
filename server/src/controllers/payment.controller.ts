import { Request, Response } from 'express';
import { createPaymentSchema, updatePaymentSchema } from '../schemas/payment.schema.js';
import * as paymentService from '../services/payment.service.js';

export async function create(req: Request, res: Response) {
    if (!req.user) { res.status(401).json({ error: 'unauthorized' }); return; }
    const result = createPaymentSchema.safeParse(req.body);
    if (!result.success) { res.status(400).json({ error: result.error.issues[0].message }); return; }
    await paymentService.createPayment(req.user.id, result.data);
    res.json({ message: 'payment posted successfully' });
}

export async function getForContract(req: Request, res: Response) {
    if (!req.user) { res.status(401).json({ error: 'unauthorized' }); return; }
    const payments = await paymentService.getPaymentsForContract(req.user.id, req.params.contract_id);
    res.json({ payments });
}

export async function resolve(req: Request, res: Response) {
    if (!req.user) { res.status(401).json({ error: 'unauthorized' }); return; }
    const result = updatePaymentSchema.safeParse(req.body);
    if (!result.success) { res.status(400).json({ error: result.error.issues[0].message }); return; }
    await paymentService.resolvePayment(req.user.id, req.params.payment_id, result.data.status);
    res.json({ message: 'payment updated successfully' });
}
