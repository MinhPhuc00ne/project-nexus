import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

function templates(scope) {
  const sender = scope === 'SHOP' ? 'Shop' : 'Bộ phận CSKH NEXUS';
  return [
    {
      name: 'Chào mừng',
      triggerType: 'WELCOME',
      content: `Chào bạn! ${sender} đã nhận được tin nhắn. Bạn mô tả vấn đề cần hỗ trợ và gửi mã đơn nếu có nhé. Không chia sẻ mật khẩu hoặc OTP trong cuộc trò chuyện.`,
    },
    {
      name: 'Phản hồi mặc định',
      triggerType: 'DEFAULT',
      content: `${sender} đã nhận được thông tin. Bạn vui lòng mô tả thêm câu hỏi và gửi mã đơn nếu liên quan giao dịch để được kiểm tra nhé.`,
    },
    {
      name: 'Vắng mặt',
      triggerType: 'OFFLINE',
      content: `${sender} hiện chưa thể phản hồi trực tiếp. Bạn để lại câu hỏi và mã đơn nếu có để được hỗ trợ khi nhân viên quay lại nhé.`,
    },
    {
      name: 'Hỏi phí vận chuyển',
      triggerType: 'KEYWORD',
      keyword: 'phí vận chuyển',
      content:
        'Bạn kiểm tra phí vận chuyển tại bước đặt hàng sau khi chọn địa chỉ nhận hàng. Nếu cần kiểm tra đơn đã đặt, vui lòng gửi mã đơn; không gửi thông tin thanh toán nhạy cảm.',
    },
    {
      name: 'Hỏi thanh toán',
      triggerType: 'KEYWORD',
      keyword: 'thanh toán',
      content:
        'Bạn thực hiện thanh toán theo hướng dẫn tại bước đặt hàng. Nếu đã thanh toán nhưng đơn chưa cập nhật, gửi mã đơn và mã giao dịch để được kiểm tra; không thanh toán lại khi giao dịch cũ chưa được đối soát. Không gửi mật khẩu, OTP hoặc thông tin thẻ.',
    },
    {
      name: 'Hỏi hủy đơn',
      triggerType: 'KEYWORD',
      keyword: 'hủy đơn',
      content:
        'Bạn mở chi tiết đơn hàng để kiểm tra tùy chọn yêu cầu hủy. Vui lòng gửi mã đơn nếu cần hỗ trợ kiểm tra điều kiện và tiến trình xử lý. Tin nhắn tự động này không xác nhận đơn đã được hủy.',
    },
    {
      name: 'Hỏi trả hàng',
      triggerType: 'KEYWORD',
      keyword: 'trả hàng',
      content:
        'Bạn gửi mã đơn, lý do muốn trả hàng và hình ảnh hoặc video thể hiện tình trạng sản phẩm để được kiểm tra theo chính sách áp dụng. Việc tiếp nhận tin nhắn chưa đồng nghĩa yêu cầu trả hàng đã được duyệt.',
    },
    {
      name: 'Hỏi hoàn tiền',
      triggerType: 'KEYWORD',
      keyword: 'hoàn tiền',
      content:
        'Bạn gửi mã đơn và mã giao dịch nếu có để được kiểm tra tình trạng hoàn tiền. Thời điểm nhận tiền phụ thuộc kết quả xử lý và đối soát; tin nhắn tự động này không xác nhận đã hoàn tiền.',
    },
    {
      name: 'Hỏi bảo hành',
      triggerType: 'KEYWORD',
      keyword: 'bảo hành',
      content:
        'Bạn gửi mã đơn, tên sản phẩm và mô tả lỗi kèm hình ảnh nếu có. Điều kiện và thời hạn bảo hành cần được kiểm tra theo thông tin sản phẩm và chính sách của bên bán.',
    },
  ].map((item) => ({ isActive: true, status: 'ACTIVE', ...item, scope }));
}

// Explicit local-only setup. Dry run by default; never overwrite seller/admin settings.
const url = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
  throw new Error('This setup script only supports a local database.');
}
const apply = process.argv.includes('--apply');
const pool = new Pool({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
try {
  const result = await prisma.$transaction(
    async (tx) => {
      // Serialize concurrent invocations of this setup script.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(1947286101)`;
      const sellers = await tx.user.findMany({
        where: { role: 'SELLER', isShopSuspended: false },
        select: { id: true },
      });
      const targets = [
        { scope: 'SYSTEM', shopId: null },
        ...sellers.map(({ id }) => ({ scope: 'SHOP', shopId: id })),
      ];
      const summary = {
        mode: apply ? 'apply' : 'preview',
        scopesCreated: 0,
        scopesSkipped: 0,
        templatesCreated: 0,
        offlineDefaultsEnabled: 0,
      };
      for (const target of targets) {
        // Explicitly upgrade only our original disabled default, never admin-blocked/custom text.
        if (process.argv.includes('--enable-offline-defaults')) {
          const offline = templates(target.scope).find((item) => item.triggerType === 'OFFLINE');
          const where = {
            ...target,
            triggerType: 'OFFLINE',
            name: 'Vắng mặt (chưa bật)',
            content: offline.content,
            status: 'ACTIVE',
            isActive: false,
          };
          if (apply) {
            const updated = await tx.chatAutoReply.updateMany({
              where,
              data: { name: 'Vắng mặt', isActive: true },
            });
            summary.offlineDefaultsEnabled += updated.count;
          } else {
            summary.offlineDefaultsEnabled += await tx.chatAutoReply.count({ where });
          }
        }
        if (await tx.chatAutoReply.count({ where: target })) {
          summary.scopesSkipped++;
          continue;
        }
        const data = templates(target.scope).map((item) => ({ ...item, shopId: target.shopId }));
        if (apply) await tx.chatAutoReply.createMany({ data });
        summary.scopesCreated++;
        summary.templatesCreated += data.length;
      }
      return summary;
    },
    { timeout: 30000 },
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  const code = String(error.code ?? error.cause?.code ?? error.name).replace(/[^a-zA-Z0-9_-]/g, '');
  process.stderr.write(
    `Auto-reply setup failed (${code}); transaction rolled back. Check local database connectivity/schema.\n`,
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await pool.end();
}
