import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const createSellerRequestFields = {
  /**
   * The proof document, when it is uploaded rather than linked.
   *
   * Multer takes the file off the body before the schema sees it, so there is
   * nothing here to validate — but the field has to appear in the schema, or
   * the upload disappears from the published API: `@ZodBody` replaces whatever
   * `@ApiBody` documented, and `ApiBodyOptions` has no `standardSchema`.
   */
  file: z.any().optional().meta({
    type: 'string',
    format: 'binary',
    description: 'Verification document file (national ID, business license, merchant contract)',
  }),
  storeName: z
    .string()
    .trim()
    .min(1)
    .describe('Seller shop or brand name')
    .meta({ example: 'Royal Vintage Timepieces Store' }),
  storeDescription: nullAsAbsent(
    z.string().describe('Brief description of the shop and planned inventory').meta({
      example: 'Curated vintage collectibles, mechanical watches, and rare editions.',
    }),
  ),
  phone: z
    .string()
    .trim()
    .min(1)
    .describe('Shop or seller contact phone number')
    .meta({ example: '0987654321' }),
  businessEmail: nullAsAbsent(
    z
      .email()
      .describe('Business contact email (if different from account email)')
      .meta({ example: 'shop@hoanggiavintage.com' }),
  ),
  identityCardNumber: nullAsAbsent(
    z
      .string()
      .describe('National ID or business registration number')
      .meta({ example: '001202008888' }),
  ),
  attachmentUrl: nullAsAbsent(
    z
      .string()
      .describe(
        'Pre-uploaded verification document URL (when not uploading via multipart/form-data)',
      )
      .meta({ example: '/uploads/seller-proofs/proof-1728123456789.png' }),
  ),
  street: z
    .string()
    .trim()
    .min(1)
    .describe('Shop or pickup warehouse street address')
    .meta({ example: '720A Dien Bien Phu' }),
  ward: nullAsAbsent(z.string().describe('Shop ward').meta({ example: 'Ward 22' })),
  district: nullAsAbsent(
    z.string().describe('Shop district').meta({ example: 'Binh Thanh District' }),
  ),
  city: z
    .string()
    .trim()
    .min(1)
    .describe('Shop province or city')
    .meta({ example: 'Ho Chi Minh City' }),
  latitude: nullAsAbsent(
    z.coerce.number().describe('Map GPS latitude for shop location').meta({ example: 10.795 }),
  ),
  longitude: nullAsAbsent(
    z.coerce.number().describe('Map GPS longitude for shop location').meta({ example: 106.721 }),
  ),
  formattedAddress: nullAsAbsent(
    z
      .string()
      .describe('Full standardized address from geocoder (Google Maps or OSM)')
      .meta({ example: 'Landmark 81, 720A Dien Bien Phu, Ward 22, Binh Thanh, Ho Chi Minh City' }),
  ),
  placeId: nullAsAbsent(z.string().describe('Map Place ID').meta({ example: 'ChIJw8qV...' })),
};

export const CreateSellerRequestSchema = z.object(createSellerRequestFields).strict();

export type CreateSellerRequestInput = z.infer<typeof CreateSellerRequestSchema>;
