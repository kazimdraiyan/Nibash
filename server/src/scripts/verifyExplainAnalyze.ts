import { pool } from "../db/pool.js";

async function verify() {
  console.log("==================================================================");
  console.log("EXPLAIN ANALYZE: Full-Text Search with tsvector & GIN Index");
  console.log("==================================================================");

  // We temporarily disable seqscan to observe index plan on small development datasets
  await pool.query("SET enable_seqscan = OFF");

  const ftsExplain = await pool.query(`
    EXPLAIN ANALYZE
    SELECT id, title, ts_rank_cd(search_document, websearch_to_tsquery('simple', 'apartment')) AS rank
    FROM listings
    WHERE status = 'approved'
      AND search_document @@ websearch_to_tsquery('simple', 'apartment')
    ORDER BY rank DESC
    LIMIT 20;
  `);
  console.log(ftsExplain.rows.map((r: any) => r["QUERY PLAN"]).join("\n"));

  console.log("\n==================================================================");
  console.log("EXPLAIN ANALYZE: Typo Tolerance Trigram Similarity on Areas");
  console.log("==================================================================");
  const trgmExplain = await pool.query(`
    EXPLAIN ANALYZE
    SELECT id, name, similarity(name, 'Dhanmondy') AS sim
    FROM areas
    WHERE name % 'Dhanmondy'
    ORDER BY sim DESC
    LIMIT 1;
  `);
  console.log(trgmExplain.rows.map((r: any) => r["QUERY PLAN"]).join("\n"));

  console.log("\n==================================================================");
  console.log("EXPLAIN ANALYZE: Structured Filters on Denormalized Columns");
  console.log("==================================================================");
  const filterExplain = await pool.query(`
    EXPLAIN ANALYZE
    SELECT id, title, rent, bedroom_count, bathroom_count, on_which_floor
    FROM listings
    WHERE status = 'approved'
      AND bedroom_count = 3
      AND bathroom_count = 2
      AND on_which_floor = 6
      AND rent <= 50000;
  `);
  console.log(filterExplain.rows.map((r: any) => r["QUERY PLAN"]).join("\n"));

  await pool.query("SET enable_seqscan = ON");
  await pool.end();
}

verify().catch((e) => {
  console.error("Verification failed:", e);
  process.exit(1);
});
