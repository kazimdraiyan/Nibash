import { pool } from '../db/pool.js';
import { AppError } from '../errors/AppError.js';
import { CreateReviewInput } from '../schemas/review.schema.js';

export async function createReview(tenantId: number, data: CreateReviewInput) {
    const { contract_id, rating, description } = data;

    const contract = await pool.query("SELECT 1 FROM contracts WHERE id=$1 AND tenant_id=$2 AND status='completed'", [contract_id, tenantId]);
    if (contract.rows.length === 0) throw new AppError(403, 'this contract doesnt exist or is not completed');

    const existing = await pool.query('SELECT 1 FROM reviews WHERE contract_id=$1', [contract_id]);
    if (existing.rows.length > 0) throw new AppError(400, 'review already exists for this contract');

    await pool.query('INSERT INTO reviews (contract_id,rating,description) VALUES ($1,$2,$3)', [contract_id, rating, description]);
}

export async function getReviewsForListing(listingId: string) {
    const listing = await pool.query('SELECT 1 FROM listings WHERE id=$1', [listingId]);
    if (listing.rows.length === 0) throw new AppError(404, 'listing not found');

    const result = await pool.query(
        'SELECT r.rating, r.description, r.created_at, AVG(r.rating) OVER () AS average_rating FROM reviews r JOIN contracts c ON c.id=r.contract_id WHERE c.listing_id=$1',
        [listingId]
    );
    return result.rows;
}
