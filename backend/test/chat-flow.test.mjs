import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});

const load = createRequire(import.meta.url);
const { ChatService } = load('../src/modules/chat/services/chat.service.ts');
const { ChatAutoReplyService } = load('../src/modules/chat/services/chat-auto-reply.service.ts');
const { CreateConversationDto } = load('../src/modules/chat/dtos/create-conversation.dto.ts');
const { SendMessageDto } = load('../src/modules/chat/dtos/send-message.dto.ts');
const { CreateAutoReplyDto, CancelAutoReplyDto } = load(
  '../src/modules/chat/dtos/auto-reply.dto.ts',
);

function createMockPrisma() {
  const users = new Map([
    [
      'buyer-1',
      {
        id: 'buyer-1',
        fullName: 'Nguyễn Văn Buyer',
        email: 'buyer@test.com',
        role: 'BUYER',
        avatarUrl: null,
      },
    ],
    [
      'seller-1',
      {
        id: 'seller-1',
        fullName: 'Trần Thị Seller',
        email: 'seller@test.com',
        role: 'SELLER',
        avatarUrl: null,
      },
    ],
    [
      'staff-1',
      {
        id: 'staff-1',
        fullName: 'Lê Staff A',
        email: 'staffA@nexus.com',
        role: 'SUPPORT_STAFF',
        avatarUrl: null,
      },
    ],
    [
      'staff-2',
      {
        id: 'staff-2',
        fullName: 'Phạm Staff B',
        email: 'staffB@nexus.com',
        role: 'SUPPORT_STAFF',
        avatarUrl: null,
      },
    ],
    [
      'admin-1',
      {
        id: 'admin-1',
        fullName: 'Võ Admin',
        email: 'admin@nexus.com',
        role: 'ADMIN',
        avatarUrl: null,
      },
    ],
  ]);

  const conversations = new Map();
  const messages = [];
  const autoReplies = new Map();

  return {
    $executeRawUnsafe: async () => 1,
    user: {
      findUnique: async ({ where }) => users.get(where.id) || null,
      findFirst: async ({ where }) => {
        for (const u of users.values()) {
          if (where.role && u.role === where.role) return u;
        }
        return null;
      },
    },
    chatConversation: {
      findFirst: async ({ where }) => {
        for (const c of conversations.values()) {
          const matchP1 = where.OR?.some(
            (o) =>
              (o.participant1Id === c.participant1Id && o.participant2Id === c.participant2Id) ||
              (o.participant1Id === c.participant2Id && o.participant2Id === c.participant1Id),
          );
          const matchType = where.type ? c.type === where.type : true;
          if (matchP1 && matchType) return c;
        }
        return null;
      },
      findUnique: async ({ where }) => conversations.get(where.id) || null,
      findMany: async () => Array.from(conversations.values()),
      count: async () => conversations.size,
      create: async ({ data }) => {
        const id = data.id || `conv-${conversations.size + 1}`;
        const record = {
          id,
          type: data.type || 'BUYER_SELLER',
          participant1Id: data.participant1Id,
          participant2Id: data.participant2Id,
          title: data.title || null,
          contextId: data.contextId || null,
          contextType: data.contextType || null,
          lastMessage: null,
          lastMessageAt: null,
          unreadCountUser1: 0,
          unreadCountUser2: 0,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          participant1: users.get(data.participant1Id),
          participant2: users.get(data.participant2Id),
          messages: [],
        };
        conversations.set(id, record);
        return record;
      },
      update: async ({ where, data }) => {
        const c = conversations.get(where.id);
        if (!c) throw new Error('Not found');
        Object.assign(c, data);
        return c;
      },
    },
    chatMessage: {
      create: async ({ data }) => {
        const id = `msg-${messages.length + 1}`;
        const sender = users.get(data.senderId);
        const record = {
          id,
          conversationId: data.conversationId,
          senderId: data.senderId,
          body: data.body,
          attachments: data.attachments || [],
          isRead: false,
          readAt: null,
          createdAt: new Date(),
          sender,
        };
        messages.push(record);
        return record;
      },
      findMany: async ({ where }) => {
        return messages.filter((m) => m.conversationId === where.conversationId);
      },
      count: async ({ where }) => {
        return messages.filter((m) => {
          if (where.conversationId && m.conversationId !== where.conversationId) return false;
          if (where.isRead !== undefined && m.isRead !== where.isRead) return false;
          if (where.senderId?.not && m.senderId === where.senderId.not) return false;
          return true;
        }).length;
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const m of messages) {
          if (
            m.conversationId === where.conversationId &&
            (!where.senderId?.not || m.senderId !== where.senderId.not) &&
            (where.isRead === undefined || m.isRead === where.isRead)
          ) {
            Object.assign(m, data);
            count++;
          }
        }
        return { count };
      },
    },
    chatAutoReply: {
      count: async ({ where }) => {
        let count = 0;
        for (const r of autoReplies.values()) {
          if (where.shopId && r.shopId !== where.shopId) continue;
          if (where.scope && r.scope !== where.scope) continue;
          count++;
        }
        return count;
      },
      create: async ({ data }) => {
        const id = `reply-${autoReplies.size + 1}`;
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        autoReplies.set(id, record);
        return record;
      },
      findFirst: async ({ where }) => {
        for (const r of autoReplies.values()) {
          if (where.id && r.id !== where.id) continue;
          if (where.shopId && r.shopId !== where.shopId) continue;
          if (where.scope && r.scope !== where.scope) continue;
          if (where.isActive !== undefined && r.isActive !== where.isActive) continue;
          if (where.status && r.status !== where.status) continue;
          return r;
        }
        return null;
      },
      findUnique: async ({ where }) => autoReplies.get(where.id) || null,
      findMany: async () => Array.from(autoReplies.values()),
      update: async ({ where, data }) => {
        const r = autoReplies.get(where.id);
        if (!r) throw new Error('Not found');
        Object.assign(r, data);
        return r;
      },
      delete: async ({ where }) => {
        autoReplies.delete(where.id);
        return { id: where.id };
      },
    },
  };
}

const mockCloudinary = {
  uploadFile: async (buf, name) => ({ url: `https://cloudinary.mock/${name}` }),
};

test('Chat Module: Chặn hoàn toàn việc người dùng nhắn tin trực tiếp cho Admin', async () => {
  const prisma = createMockPrisma();
  const autoReplyService = new ChatAutoReplyService(prisma);
  const chatService = new ChatService(prisma, mockCloudinary, autoReplyService);

  const dto = new CreateConversationDto();
  dto.participantId = 'admin-1';

  await assert.rejects(
    async () => chatService.createOrGetConversation('buyer-1', 'BUYER', dto),
    (err) => err instanceof BadRequestException && err.message.includes('Quản trị viên'),
  );
});

test('Chat Module: Chặn gửi tin nhắn chứa từ ngữ cấm hoặc nhạy cảm', async () => {
  const prisma = createMockPrisma();
  const autoReplyService = new ChatAutoReplyService(prisma);
  const chatService = new ChatService(prisma, mockCloudinary, autoReplyService);

  const conv = await prisma.chatConversation.create({
    data: { participant1Id: 'buyer-1', participant2Id: 'seller-1' },
  });

  const sendDto = new SendMessageDto();
  sendDto.conversationId = conv.id;
  sendDto.content = 'Tôi muốn mua súng đạn và vũ khí cấm';

  await assert.rejects(
    async () => chatService.sendMessage('buyer-1', 'BUYER', sendDto),
    (err) => err instanceof BadRequestException && err.message.includes('nhạy cảm'),
  );
});

test('Chat Module: Hộp thư chung CSKH Staff Desk - Ẩn danh nhân viên với khách và staff khác, hiển thị đầy đủ với Admin', async () => {
  const prisma = createMockPrisma();
  const autoReplyService = new ChatAutoReplyService(prisma);
  const chatService = new ChatService(prisma, mockCloudinary, autoReplyService);

  // 1. Buyer khởi tạo cuộc trò chuyện với Staff
  const createDto = new CreateConversationDto();
  createDto.participantId = 'staff-1';
  const conv = await chatService.createOrGetConversation('buyer-1', 'BUYER', createDto);
  assert.equal(conv.type, 'STAFF_BUYER');

  // 2. Staff A trả lời buyer
  const sendDto = new SendMessageDto();
  sendDto.conversationId = conv.id;
  sendDto.content = 'Chào bạn, nhân viên CSKH xin hỗ trợ.';
  await chatService.sendMessage('staff-1', 'SUPPORT_STAFF', sendDto);

  // 3. Staff B đăng nhập và đọc lịch sử tin nhắn -> Người gửi phải được ẩn danh thành "Nhân viên Hỗ trợ Nexus"
  const staffBView = await chatService.listMessages(conv.id, 'staff-2', 'SUPPORT_STAFF', {});
  assert.equal(staffBView.messages.length, 1);
  assert.equal(staffBView.messages[0].sender.fullName, 'Nhân viên Hỗ trợ Nexus');
  assert.equal(staffBView.messages[0].senderId, 'SUPPORT_STAFF_DESK');

  // 4. Buyer đọc tin nhắn -> Cũng thấy "Nhân viên Hỗ trợ Nexus"
  const buyerView = await chatService.listMessages(conv.id, 'buyer-1', 'BUYER', {});
  assert.equal(buyerView.messages[0].sender.fullName, 'Nhân viên Hỗ trợ Nexus');

  // 5. Admin kiểm tra Audit -> Thấy chính xác tên và ID thật của Staff A
  const adminView = await chatService.listMessages(conv.id, 'admin-1', 'ADMIN', {});
  assert.equal(adminView.messages[0].sender.id, 'staff-1');
  assert.equal(adminView.messages[0].sender.fullName, 'Lê Staff A');
});

test('Chat Module: Seller Auto-Reply - Kiểm duyệt từ cấm khi tạo và Admin có quyền khóa kèm lý do', async () => {
  const prisma = createMockPrisma();
  const autoReplyService = new ChatAutoReplyService(prisma);

  // 1. Tạo auto-reply có từ cấm -> Bị chặn
  const badDto = new CreateAutoReplyDto();
  badDto.content = 'Shop có bán vũ khí và ma túy các loại';
  await assert.rejects(
    async () => autoReplyService.createSellerAutoReply('seller-1', badDto),
    (err) => err instanceof BadRequestException && err.message.includes('nhạy cảm'),
  );

  // 2. Tạo auto-reply hợp lệ -> Thành công
  const goodDto = new CreateAutoReplyDto();
  goodDto.content = 'Cảm ơn bạn đã nhắn tin cho shop! Shop sẽ trả lời bạn sớm nhất.';
  const reply = await autoReplyService.createSellerAutoReply('seller-1', goodDto);
  assert.equal(reply.status, 'ACTIVE');

  // 3. Admin khóa tin nhắn tự động của Seller kèm lý do
  const cancelDto = new CancelAutoReplyDto();
  cancelDto.cancelReason = 'Chứa thông tin quảng cáo ngoài sàn trái phép';
  const cancelled = await autoReplyService.cancelSellerAutoReply('admin-1', reply.id, cancelDto);
  assert.equal(cancelled.status, 'CANCELLED_BY_ADMIN');
  assert.equal(cancelled.isActive, false);
  assert.equal(cancelled.cancelReason, 'Chứa thông tin quảng cáo ngoài sàn trái phép');

  // 4. Seller không thể tự ý sửa tin nhắn đã bị Admin khóa
  await assert.rejects(
    async () =>
      autoReplyService.updateSellerAutoReply('seller-1', reply.id, { content: 'Nội dung mới' }),
    (err) => err instanceof ForbiddenException && err.message.includes('Quản trị viên khóa'),
  );
});

test('Chat Module: Đánh dấu đã đọc và Đếm tin nhắn chưa đọc chuẩn xác', async () => {
  const prisma = createMockPrisma();
  const autoReplyService = new ChatAutoReplyService(prisma);
  const chatService = new ChatService(prisma, mockCloudinary, autoReplyService);

  const conv = await prisma.chatConversation.create({
    data: { participant1Id: 'buyer-1', participant2Id: 'seller-1' },
  });

  // Buyer gửi 2 tin nhắn
  const sendDto1 = new SendMessageDto();
  sendDto1.conversationId = conv.id;
  sendDto1.content = 'Tin 1';
  await chatService.sendMessage('buyer-1', 'BUYER', sendDto1);

  const sendDto2 = new SendMessageDto();
  sendDto2.conversationId = conv.id;
  sendDto2.content = 'Tin 2';
  await chatService.sendMessage('buyer-1', 'BUYER', sendDto2);

  // Seller kiểm tra unread count
  const unreadBefore = await chatService.getTotalUnreadCount('seller-1');
  assert.equal(unreadBefore.unreadCount, 2);

  // Seller đánh dấu đã đọc
  await chatService.markAsRead(conv.id, 'seller-1', 'SELLER');

  // Seller kiểm tra lại unread count -> Phải về 0
  const unreadAfter = await chatService.getTotalUnreadCount('seller-1');
  assert.equal(unreadAfter.unreadCount, 0);
});
