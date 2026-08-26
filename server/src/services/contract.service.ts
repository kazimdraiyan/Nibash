import { pool } from '../db/pool.js';
import { AppError } from '../errors/AppError.js';
import { CreateContractInput } from '../schemas/contract.schema.js';

export async function createContract(ownerId: number, data: CreateContractInput) {
    const { listing_id, tenant_id, rent, electricity_bill, water_bill, service_charge, monthly_due_date, pet_allowed, security_deposit, start_date, end_date } = data;

    const isOwner = await pool.query('SELECT 1 FROM owners WHERE user_id=$1', [ownerId]);
    if (isOwner.rows.length === 0) throw new AppError(403, 'you are not an owner');

    const listing = await pool.query('SELECT 1 FROM listings WHERE id=$1 AND owner_id=$2', [listing_id, ownerId]);
    if (listing.rows.length === 0) throw new AppError(403, 'this listing isnt yours');

    const application = await pool.query("SELECT 1 FROM applies WHERE tenant_id=$1 AND listing_id=$2 AND status='pending'", [tenant_id, listing_id]);
    if (application.rows.length === 0) throw new AppError(403, 'this application isnt pending');

    const activeContract = await pool.query("SELECT 1 FROM contracts WHERE listing_id=$1 AND status IN ('proposed','signed')", [listing_id]);
    if (activeContract.rows.length > 0) throw new AppError(403, 'there is already an active contract for this listing');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const insertTerms = await client.query(
            'INSERT INTO terms (rent,electricity_bill,water_bill,service_charge,monthly_due_date,pet_allowed,security_deposit) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
            [rent, electricity_bill, water_bill, service_charge, monthly_due_date, pet_allowed, security_deposit]
        );
        const termsId = insertTerms.rows[0].id;
        const insertAgreement = await client.query('INSERT INTO agreements (terms_id) VALUES ($1) RETURNING terms_id', [termsId]);
        const agreementId = insertAgreement.rows[0].terms_id;
        const insertContract = await client.query(
            "INSERT INTO contracts (listing_id,tenant_id,agreement_id,start_date,end_date,status) VALUES ($1,$2,$3,$4,$5,'proposed') RETURNING id",
            [listing_id, tenant_id, agreementId, start_date, end_date]
        );
        const contractId = insertContract.rows[0].id;
        await client.query("UPDATE applies SET status='approved' WHERE tenant_id=$1 AND listing_id=$2", [tenant_id, listing_id]);
        await client.query("UPDATE applies SET status='rejected' WHERE listing_id=$1 AND tenant_id!=$2 AND status='pending'", [listing_id, tenant_id]);
        await client.query('COMMIT');
        return contractId;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function getContractById(id: string, userId: number) {
    const contract = await pool.query(
        'SELECT l.owner_id, c.tenant_id FROM contracts c JOIN listings l ON c.listing_id=l.id WHERE c.id=$1',
        [id]
    );
    if (contract.rows.length === 0) throw new AppError(404, 'contract not found');
    if (contract.rows[0].owner_id !== userId && contract.rows[0].tenant_id !== userId) {
        throw new AppError(403, 'not authorized');
    }
    const result = await pool.query(
        `SELECT c.id AS contract_id, c.tenant_id, c.listing_id, c.agreement_id,
         c.status, c.start_date, c.end_date, c.paid_security_deposit,
         t.rent, t.electricity_bill, t.water_bill, t.service_charge,
         t.monthly_due_date, t.pet_allowed, t.security_deposit
         FROM contracts c
         JOIN agreements a ON a.terms_id=c.agreement_id
         JOIN terms t ON t.id=a.terms_id
         WHERE c.id=$1`,
        [id]
    );
    return result.rows[0];
}

export async function signContract(id: string, userId: number) {
    const contract = await pool.query(
        'SELECT l.owner_id, c.tenant_id, c.status FROM contracts c JOIN listings l ON c.listing_id=l.id WHERE c.id=$1',
        [id]
    );
    if (contract.rows.length === 0) throw new AppError(404, 'contract not found');
    if (contract.rows[0].tenant_id !== userId) throw new AppError(403, 'not authorized');
    if (contract.rows[0].status !== 'proposed') throw new AppError(400, 'contract status cannot be updated');
    await pool.query("UPDATE contracts SET status='signed' WHERE id=$1", [id]);
}
