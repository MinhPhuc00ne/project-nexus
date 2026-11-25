/**
 * Demo catalogue: categories, products, images, options and stock.
 *
 * Some products carry a live sale window so the home page's flash sale section
 * has real discounted products to show instead of the invented percentages it
 * used to display.
 */
import { PrismaClient, ProductStatus } from '@prisma/client';
import { DemoClock, SeededRandom } from './random';
import type { DemoPeople } from './01-users-shops';

export interface DemoProduct {
  id: string;
  sellerId: string;
  title: string;
  basePrice: number;
  salePrice: number | null;
  inventoryId: string;
}

export interface DemoCatalog {
  categories: Array<{ id: string; name: string; slug: string }>;
  products: DemoProduct[];
}

interface CategorySpec {
  name: string;
  slug: string;
  children: Array<{ name: string; slug: string }>;
}

const CATEGORIES: CategorySpec[] = [
  {
    name: 'Đồ gỗ & Nội thất cổ',
    slug: 'do-go-noi-that-co',
    children: [
      { name: 'Tủ chè, sập gụ', slug: 'tu-che-sap-gu' },
      { name: 'Hoành phi, câu đối', slug: 'hoanh-phi-cau-doi' },
    ],
  },
  {
    name: 'Gốm sứ & Thuỷ tinh',
    slug: 'gom-su-thuy-tinh',
    children: [
      { name: 'Gốm Chu Đậu', slug: 'gom-chu-dau' },
      { name: 'Sứ Bát Tràng', slug: 'su-bat-trang' },
    ],
  },
  {
    name: 'Tiền cổ & Tem',
    slug: 'tien-co-tem',
    children: [
      { name: 'Tiền giấy Đông Dương', slug: 'tien-giay-dong-duong' },
      { name: 'Tem thư trước 1975', slug: 'tem-thu-truoc-1975' },
    ],
  },
  {
    name: 'Đồng hồ & Máy ảnh',
    slug: 'dong-ho-may-anh',
    children: [
      { name: 'Đồng hồ cơ', slug: 'dong-ho-co' },
      { name: 'Máy ảnh phim', slug: 'may-anh-phim' },
    ],
  },
  {
    name: 'Tranh & Thư pháp',
    slug: 'tranh-thu-phap',
    children: [
      { name: 'Tranh sơn mài', slug: 'tranh-son-mai' },
      { name: 'Thư pháp Hán Nôm', slug: 'thu-phap-han-nom' },
    ],
  },
];

/** Product names per leaf category slug, so a listing reads like a real shop. */
const PRODUCT_NAMES: Record<string, string[]> = {
  'tu-che-sap-gu': [
    'Tủ chè gỗ gụ chạm tứ quý đầu thế kỷ 20',
    'Sập gụ chân quỳ nguyên bản Bắc Bộ',
    'Trường kỷ gỗ trắc khảm trai',
  ],
  'hoanh-phi-cau-doi': ['Hoành phi sơn thếp vàng "Đức Lưu Quang"', 'Đôi câu đối gỗ mít chạm triện'],
  'gom-chu-dau': [
    'Bình gốm Chu Đậu hoa lam vẽ sen',
    'Ấm gốm Chu Đậu men ngọc phục chế',
    'Đĩa gốm Chu Đậu vẽ cá chép',
  ],
  'su-bat-trang': [
    'Lọ sứ Bát Tràng men rạn cổ',
    'Bộ ấm chén sứ Bát Tràng vẽ tay',
    'Choé sứ Bát Tràng men lam',
  ],
  'tien-giay-dong-duong': [
    'Tờ 1 đồng Đông Dương 1921 còn nguyên',
    'Bộ 5 tờ tiền Đông Dương thập niên 1930',
  ],
  'tem-thu-truoc-1975': ['Bộ tem Việt Nam Cộng hoà 1968', 'Tem thư Bắc Việt 1954 còn keo'],
  'dong-ho-co': [
    'Đồng hồ Poljot 17 Jewels Liên Xô',
    'Đồng hồ Seiko 5 Automatic thập niên 70',
    'Đồng hồ treo tường Odo 36 gông',
  ],
  'may-anh-phim': ['Máy ảnh Zenit-E kèm ống Helios 44-2', 'Canon AE-1 Program còn hoạt động tốt'],
  'tranh-son-mai': ['Tranh sơn mài "Thiếu nữ bên hoa sen"', 'Tranh sơn mài phong cảnh Hồ Tây'],
  'thu-phap-han-nom': ['Thư pháp "Tâm An" trên giấy dó', 'Thư pháp Hán Nôm khắc gỗ lưu niên'],
};

const CONDITIONS = [
  'Nguyên bản, chưa qua phục chế.',
  'Đã vệ sinh nhẹ, giữ nguyên lớp men gốc.',
  'Có vết thời gian tự nhiên, không nứt vỡ.',
  'Phục chế một phần, có ảnh trước và sau.',
];

/**
 * Creates the demo catalogue and stocks it.
 *
 * @param prisma - A connected client.
 * @param clock - The run's clock.
 * @param random - The run's generator.
 * @param people - The sellers that own the products and the warehouse to stock.
 * @returns The catalogue other modules order from.
 */
export async function seedCatalogAndInventory(
  prisma: PrismaClient,
  clock: DemoClock,
  random: SeededRandom,
  people: DemoPeople,
): Promise<DemoCatalog> {
  const categories: DemoCatalog['categories'] = [];
  const leafSlugs: string[] = [];
  const leafIds = new Map<string, string>();

  for (const spec of CATEGORIES) {
    const parent = await prisma.category.create({
      data: { name: spec.name, slug: spec.slug, level: 1 },
      select: { id: true, name: true, slug: true },
    });
    categories.push(parent);

    for (const child of spec.children) {
      const leaf = await prisma.category.create({
        data: { name: child.name, slug: child.slug, level: 2, parentId: parent.id },
        select: { id: true, name: true, slug: true },
      });
      categories.push(leaf);
      leafSlugs.push(child.slug);
      leafIds.set(child.slug, leaf.id);
    }
  }

  const products: DemoProduct[] = [];

  for (const slug of leafSlugs) {
    const names = PRODUCT_NAMES[slug] ?? [];
    for (const [index, title] of names.entries()) {
      const seller = people.sellers[(products.length + index) % people.sellers.length];
      const basePrice = random.money(450_000, 48_000_000, 50_000);

      // Roughly a third of the catalogue is on sale right now, and a few sales
      // are scheduled to start later so the admin can see an upcoming one.
      const onSaleNow = random.chance(0.34);
      const scheduled = !onSaleNow && random.chance(0.15);
      const salePrice =
        onSaleNow || scheduled
          ? Math.round((basePrice * (0.6 + random.next() * 0.25)) / 1000) * 1000
          : null;
      const saleStartsAt = onSaleNow
        ? clock.hoursAgo(random.int(2, 48))
        : scheduled
          ? clock.hoursFromNow(random.int(6, 72))
          : null;
      const saleEndsAt = onSaleNow
        ? clock.hoursFromNow(random.int(6, 96))
        : scheduled
          ? clock.daysFromNow(random.int(5, 14))
          : null;

      const createdAt = clock.daysAgo(random.int(1, 120));
      const product = await prisma.product.create({
        data: {
          sellerId: seller.id,
          categoryId: leafIds.get(slug)!,
          title,
          description: [
            title,
            '',
            `Tình trạng: ${random.pick(CONDITIONS)}`,
            `Xuất xứ: ${random.pick(['Bắc Bộ', 'Trung Bộ', 'Nam Bộ', 'Nhập khẩu trước 1975'])}.`,
            'Cam kết hoàn tiền nếu hiện vật không đúng mô tả.',
          ].join('\n'),
          basePrice,
          // A sale price must stay under the base price and at or above 1000, or
          // the products_sale_price_check constraint rejects the row.
          salePrice: salePrice && salePrice >= 1000 && salePrice < basePrice ? salePrice : null,
          saleStartsAt,
          saleEndsAt,
          weightGrams: random.int(200, 8000),
          lengthCm: random.int(10, 80),
          widthCm: random.int(10, 60),
          heightCm: random.int(5, 50),
          status: ProductStatus.ACTIVE,
          createdAt,
          updatedAt: createdAt,
          images: {
            create: Array.from({ length: random.int(2, 4) }, (_, imageIndex) => ({
              imageUrl: `https://picsum.photos/seed/${encodeURIComponent(`${slug}-${index}-${imageIndex}`)}/800/600`,
              isThumbnail: imageIndex === 0,
              sortOrder: imageIndex,
            })),
          },
          options: random.chance(0.4)
            ? {
                create: {
                  name: 'Tình trạng',
                  values: ['Nguyên bản', 'Đã phục chế'],
                },
              }
            : undefined,
        },
        select: { id: true, title: true },
      });

      const inventory = await prisma.inventory.create({
        data: {
          warehouseId: people.warehouse.id,
          productId: product.id,
          totalQty: random.int(1, 12),
          availableQty: 0,
          reservedQty: 0,
        },
        select: { id: true, totalQty: true },
      });
      // Available stock starts equal to the total, with a ledger row recording it.
      await prisma.inventory.update({
        where: { id: inventory.id },
        data: { availableQty: inventory.totalQty },
      });
      await prisma.inventoryLedger.create({
        data: {
          inventoryId: inventory.id,
          changeQty: inventory.totalQty,
          balanceAfter: inventory.totalQty,
          reason: 'Nhập kho ban đầu (demo)',
        },
      });

      products.push({
        id: product.id,
        sellerId: seller.id,
        title: product.title,
        basePrice,
        salePrice,
        inventoryId: inventory.id,
      });
    }
  }

  return { categories, products };
}
