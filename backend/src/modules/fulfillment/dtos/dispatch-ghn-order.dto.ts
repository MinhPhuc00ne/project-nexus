import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

/**
 * Parcel overrides a seller can supply when a shipment is booked.
 *
 * This describes a package handed to a carrier, not an order, so it belongs to
 * fulfillment. It used to live among the seller order DTOs, which made the
 * fulfillment module import from commerce and closed an import cycle between
 * them.
 */
const dispatchGhnOrderFields = {
  weightGrams: nullAsAbsent(
    z.coerce.number().int().min(50).describe('Khối lượng gói hàng (grams)').meta({ example: 500 }),
  ),
  lengthCm: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Chiều dài gói hàng (cm)').meta({ example: 20 }),
  ),
  widthCm: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Chiều rộng gói hàng (cm)').meta({ example: 15 }),
  ),
  heightCm: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Chiều cao gói hàng (cm)').meta({ example: 10 }),
  ),
  note: nullAsAbsent(
    z.string().describe('Ghi chú cho shipper GHN').meta({ example: 'Hàng dễ vỡ, xin nhẹ tay' }),
  ),
};

export const DispatchGhnOrderSchema = z.object(dispatchGhnOrderFields).strict();

export type DispatchGhnOrderInput = z.infer<typeof DispatchGhnOrderSchema>;
