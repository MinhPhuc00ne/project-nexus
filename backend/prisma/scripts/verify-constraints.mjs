#!/usr/bin/env node
/**
 * Asserts that every data integrity rule which cannot be expressed in
 * `schema.prisma` is actually present in the database.
 *
 * `0001_init` is generated from `schema.prisma` and therefore cannot carry CHECK
 * constraints or partial indexes; `0002_constraints_and_partial_indexes` adds
 * them by hand. A future schema change that regenerates the init migration would
 * silently drop them, so CI runs this script against a migrated database.
 *
 * Usage: node prisma/scripts/verify-constraints.mjs
 * Reads DATABASE_URL from the environment (or the repository .env).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

/** CHECK constraints that must exist, as `table.constraint_name`. */
const EXPECTED_CHECKS = [
  'auction_awards.auction_awards_deposit_amount_check',
  'banner_disable_history.banner_disable_history_is_active_check',
  'banner_disable_history.banner_disable_history_was_active_check',
  'customer_reviews.customer_reviews_rating_check',
  'event_banners.event_banners_dates_check',
  'order_refunds.order_refunds_amount_check',
  'product_options.product_options_values_check',
  'product_reviews.product_reviews_rating_check',
  'products.products_review_stats_check',
  'products.products_sale_dates_check',
  'products.products_sale_price_check',
  'seller_ghn_accounts.seller_ghn_accounts_verified_check',
  'wallets.wallets_balance_check',
  'wallets.wallets_owner_matches_type_check',
];

/** Partial (predicated) unique indexes that must exist. */
const EXPECTED_PARTIAL_INDEXES = [
  'auction_awards.auction_awards_one_live_lot_offer',
  'wallets.wallets_one_per_platform_type',
];

/**
 * Columns that used to be guarded by a CHECK constraint and are now PostgreSQL
 * enum types. The labels must stay exactly as the old CHECK allowed, otherwise
 * the squash widened a domain that used to be closed.
 */
const EXPECTED_ENUM_COLUMNS = {
  'after_sales_requests.kind': ['CANCEL', 'RETURN'],
  'after_sales_requests.status': [
    'REQUESTED',
    'APPROVING',
    'APPROVED',
    'RECEIVED',
    'COMPLETED',
    'REJECTED',
  ],
  'banner_disable_history.source': ['UPDATE', 'DELETE', 'DISABLE'],
  'order_refunds.destination': ['WALLET', 'ORIGINAL'],
  'order_refunds.status': ['PENDING', 'SUCCESS'],
  'orders.cancellation_actor': ['BUYER', 'SELLER', 'SYSTEM', 'ADMIN'],
  'seller_ghn_accounts.environment': ['SANDBOX', 'PRODUCTION'],
  'seller_ghn_accounts.status': ['PENDING', 'VERIFIED'],
};

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const candidate of [path.join(repoRoot, '.env'), path.join(repoRoot, 'backend/.env')]) {
    let contents;
    try {
      contents = readFileSync(candidate, 'utf8');
    } catch {
      continue;
    }
    const match = contents.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL is not set and no .env file provides it');
}

async function main() {
  const client = new Client({ connectionString: resolveDatabaseUrl() });
  await client.connect();

  const failures = [];
  try {
    const { rows: checkRows } = await client.query(
      `select conrelid::regclass::text as table_name, conname
         from pg_constraint
        where contype = 'c' and connamespace = 'public'::regnamespace`,
    );
    const presentChecks = new Set(checkRows.map((r) => `${r.table_name}.${r.conname}`));
    for (const expected of EXPECTED_CHECKS) {
      if (!presentChecks.has(expected)) failures.push(`missing CHECK constraint: ${expected}`);
    }

    const { rows: indexRows } = await client.query(
      `select tablename, indexname
         from pg_indexes
        where schemaname = 'public' and indexdef like '%WHERE%'`,
    );
    const presentIndexes = new Set(indexRows.map((r) => `${r.tablename}.${r.indexname}`));
    for (const expected of EXPECTED_PARTIAL_INDEXES) {
      if (!presentIndexes.has(expected)) failures.push(`missing partial index: ${expected}`);
    }

    const { rows: enumRows } = await client.query(
      `select c.table_name, c.column_name, c.udt_name,
              coalesce(
                (select array_agg(e.enumlabel::text order by e.enumsortorder)
                   from pg_enum e
                   join pg_type t on t.oid = e.enumtypid
                  where t.typname = c.udt_name),
                '{}'
              ) as labels
         from information_schema.columns c
        where c.table_schema = 'public'`,
    );
    const enumByColumn = new Map(
      enumRows.map((r) => [`${r.table_name}.${r.column_name}`, r.labels ?? []]),
    );
    for (const [column, expectedLabels] of Object.entries(EXPECTED_ENUM_COLUMNS)) {
      const actual = enumByColumn.get(column);
      if (!actual || actual.length === 0) {
        failures.push(`column is not an enum type (lost its closed domain): ${column}`);
        continue;
      }
      const missing = expectedLabels.filter((label) => !actual.includes(label));
      const extra = actual.filter((label) => !expectedLabels.includes(label));
      if (missing.length) failures.push(`${column} enum is missing labels: ${missing.join(', ')}`);
      if (extra.length) failures.push(`${column} enum gained labels: ${extra.join(', ')}`);
    }
  } finally {
    await client.end();
  }

  const total =
    EXPECTED_CHECKS.length +
    EXPECTED_PARTIAL_INDEXES.length +
    Object.keys(EXPECTED_ENUM_COLUMNS).length;

  if (failures.length) {
    console.error(`Database integrity verification FAILED (${failures.length} of ${total}):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  console.log(
    `Database integrity verified: ${EXPECTED_CHECKS.length} CHECK constraints, ` +
      `${EXPECTED_PARTIAL_INDEXES.length} partial indexes, ` +
      `${Object.keys(EXPECTED_ENUM_COLUMNS).length} closed enum domains.`,
  );
}

main().catch((error) => {
  console.error(`Database integrity verification errored: ${error.message}`);
  process.exit(1);
});
