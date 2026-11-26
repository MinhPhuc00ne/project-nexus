import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

/**
 * Data transfer object used by Seller to register an item with online appraisal certificates into an auction.
 */
const registerAuctionItemFields = {
  title: z
    .string()
    .trim()
    .min(1)
    .describe('Consigned item public title')
    .meta({ example: 'Patek Philippe Nautilus 5711/1R-001 Rose Gold 18K' }),
  description: z
    .string()
    .trim()
    .min(1)
    .describe('Detailed description, provenance, and physical condition of the consigned item')
    .meta({
      example:
        'Pristine condition 99%, complete original box, papers and international warranty certificate dated 2024.',
    }),
  images: z
    .array(z.string())
    .min(1)
    .describe('List of high-resolution product image URLs from multiple angles')
    .meta({ example: ['https://example.com/patek1.jpg', 'https://example.com/patek2.jpg'] }),
  threeModelKey: nullAsAbsent(
    z
      .string()
      .describe('Storage key for the interactive 3D inspection model (if available)')
      .meta({ example: 'models/patek-5711.glb' }),
  ),
  proposedStartingPrice: z.coerce
    .number()
    .min(10000)
    .describe('Proposed starting bid price in VND currency')
    .meta({ example: 150000000 }),
  proposedReservePrice: nullAsAbsent(
    z.coerce
      .number()
      .describe('Proposed minimum reserve price in VND currency (minimum acceptable sale price)')
      .meta({ example: 180000000 }),
  ),
  proposedBidIncrement: z.coerce
    .number()
    .min(1000)
    .describe('Proposed minimum price increment per bid step in VND currency')
    .meta({ example: 2000000 })
    .default(100000),
  appraisalCertificateNumber: nullAsAbsent(
    z
      .string()
      .describe('Appraisal / authentication certificate identifier number')
      .meta({ example: 'GIA-2026-PP-998822' }),
  ),
  appraisalAgency: nullAsAbsent(
    z
      .string()
      .describe('Name of the appraisal authority or certifying laboratory')
      .meta({ example: 'Gemological Institute of America (GIA)' }),
  ),
  certificateImages: z
    .array(z.string())
    .min(1)
    .describe(
      'List of online appraisal certificate scan images, purchase invoices, and warranty cards',
    )
    .meta({
      example: [
        'https://example.com/cert-patek-front.jpg',
        'https://example.com/cert-patek-back.jpg',
      ],
    }),
  certificateIssueDate: nullAsAbsent(
    z.iso
      .datetime()
      .describe('Certificate issue date in ISO 8601 format')
      .meta({ example: '2026-05-15T00:00:00.000Z' }),
  ),
  weightGrams: z.coerce
    .number()
    .int()
    .min(1)
    .max(50000)
    .describe('Parcel weight in grams for GHN shipping calculation')
    .meta({ example: 800 })
    .default(500),
  lengthCm: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .describe('Parcel length in cm for GHN shipping calculation')
    .meta({ example: 25 })
    .default(20),
  widthCm: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .describe('Parcel width in cm for GHN shipping calculation')
    .meta({ example: 20 })
    .default(15),
  heightCm: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .describe('Parcel height in cm for GHN shipping calculation')
    .meta({ example: 15 })
    .default(10),
};

export const RegisterAuctionItemSchema = z.object(registerAuctionItemFields).strict();

export type RegisterAuctionItemInput = z.infer<typeof RegisterAuctionItemSchema>;
