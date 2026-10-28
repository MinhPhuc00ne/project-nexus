import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { QueryProductDto } from '../dtos/query-product.dto';

export async function priceSortedIds(
  prisma: PrismaService,
  query: QueryProductDto,
  categoryIds: string[] | undefined,
  skip: number,
  take: number,
): Promise<string[]> {
  const now = new Date();
  const price = Prisma.sql`CASE WHEN p.sale_price IS NOT NULL AND (p.sale_starts_at IS NULL OR p.sale_starts_at <= ${now})
    AND (p.sale_ends_at IS NULL OR p.sale_ends_at > ${now}) THEN p.sale_price ELSE p.base_price END`;
  const clauses = [Prisma.sql`p.status = 'ACTIVE' AND u.is_shop_suspended = false`];
  if (categoryIds?.length) clauses.push(Prisma.sql`p.category_id IN (${Prisma.join(categoryIds)})`);
  if (query.sellerId) clauses.push(Prisma.sql`p.seller_id = ${query.sellerId}`);
  if (query.minPrice !== undefined) clauses.push(Prisma.sql`${price} >= ${query.minPrice}`);
  if (query.maxPrice !== undefined) clauses.push(Prisma.sql`${price} <= ${query.maxPrice}`);
  if (query.minRating !== undefined)
    clauses.push(Prisma.sql`p.average_rating >= ${query.minRating}`);
  if (query.inStock === 'true')
    clauses.push(
      Prisma.sql`EXISTS (SELECT 1 FROM inventories i WHERE i.product_id = p.id AND i.available_qty > 0)`,
    );
  if (query.inStock === 'false')
    clauses.push(
      Prisma.sql`NOT EXISTS (SELECT 1 FROM inventories i WHERE i.product_id = p.id AND i.available_qty > 0)`,
    );
  if (query.city)
    clauses.push(
      Prisma.sql`EXISTS (SELECT 1 FROM seller_upgrade_requests r WHERE r.user_id = u.id AND r.status = 'APPROVED' AND position(lower(${query.city.trim()}) in lower(r.city)) > 0)`,
    );
  if (query.search?.trim()) {
    const term = query.search.trim();
    clauses.push(Prisma.sql`(position(lower(${term}) in lower(p.title)) > 0 OR position(lower(${term}) in lower(p.description)) > 0
      OR position(lower(${term}) in lower(u.full_name)) > 0 OR EXISTS (SELECT 1 FROM seller_upgrade_requests r WHERE r.user_id = u.id
      AND r.status = 'APPROVED' AND position(lower(${term}) in lower(r.store_name)) > 0))`);
  }
  const direction = query.sortBy === 'price_desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;
  const rows = await prisma.$queryRaw<
    { id: string }[]
  >(Prisma.sql`SELECT p.id FROM products p JOIN users u ON u.id = p.seller_id
    WHERE ${Prisma.join(clauses, ' AND ')} ORDER BY ${price} ${direction}, p.id ASC OFFSET ${skip} LIMIT ${take}`);
  return rows.map((row) => row.id);
}
