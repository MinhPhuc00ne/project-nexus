import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { ShopViolationPenaltyLevel, ViolationStatus } from '@prisma/client';

const createShopViolationFields = {
  title: z
    .string()
    .trim()
    .min(1)
    .describe('Tiêu đề vi phạm của shop')
    .meta({ example: 'Bán hàng giả mạo nhãn hiệu đã bảo hộ' }),
  description: z.string().trim().min(1).describe('Mô tả chi tiết hành vi vi phạm').meta({
    example:
      'Shop có hành vi đăng bán sản phẩm vi phạm bản quyền thương hiệu, không xuất trình được hóa đơn nguồn gốc.',
  }),
  evidenceUrls: nullAsAbsent(
    z
      .array(z.string())
      .describe('Danh sách URL hình ảnh hoặc tài liệu bằng chứng vi phạm')
      .meta({ example: ['https://example.com/evidence1.jpg', 'https://example.com/report.pdf'] }),
  ),
  penaltyLevel: nullAsAbsent(
    z
      .enum(ShopViolationPenaltyLevel)
      .describe(
        'Mức độ xử lý vi phạm: WARNING, PENALTY_POINTS, TEMPORARY_SUSPENSION, PERMANENT_BAN, MISREPRESENTATION, FRAUD',
      )
      .meta({ example: ShopViolationPenaltyLevel.TEMPORARY_SUSPENSION }),
  ),
  status: z
    .enum(ViolationStatus)
    .describe('Trạng thái vi phạm: PENDING, INVESTIGATING, CONFIRMED, DISMISSED')
    .meta({ example: ViolationStatus.CONFIRMED })
    .default(ViolationStatus.CONFIRMED),
  resolutionNotes: nullAsAbsent(
    z.string().describe('Ghi chú giải quyết của Quản trị viên').meta({
      example:
        'Đã xác minh đối soát với chủ thương hiệu, tiến hành tạm ẩn sản phẩm và cảnh cáo shop.',
    }),
  ),
};

export const CreateShopViolationSchema = z.object(createShopViolationFields).strict();

export type CreateShopViolationInput = z.infer<typeof CreateShopViolationSchema>;
