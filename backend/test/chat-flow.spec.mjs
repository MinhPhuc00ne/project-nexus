import { createFakeRedis } from './helpers/fake-redis.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from './helpers/vitest-node-compat.mjs';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});

const load = createRequire(import.meta.url);
const { ChatService } = load('../src/modules/chat/services/chat.service.ts');
const { ChatAutoReplyService } = load('../src/modules/chat/services/chat-auto-reply.service.ts');
const { StaffQueueService } = load('../src/modules/chat/services/staff-queue.service.ts');
const { CreateConversationSchema } = load('../src/modules/chat/dtos/create-conversation.dto.ts');
const { SendMessageSchema } = load('../src/modules/chat/dtos/send-message.dto.ts');
const { RequestSupportSchema, UpdateConversationStatusSchema, TicketLifecycleStatus } = load(
  '../src/modules/chat/dtos/support-queue.dto.ts',
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
      'staff-3',
      {
        id: 'staff-3',
        fullName: 'Hoàng Staff C',
        email: 'staffC@nexus.com',
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

  const disputes = new Map([
    [
      'dispute-101',
      {
        id: 'dispute-101',
        orderId: 'order-999',
        openedByUserId: 'buyer-1',
        reason: 'Hàng không đúng mô tả',
        status: 'OPEN',
        order: { id: 'order-999', buyerId: 'buyer-1', sellerId: 'seller-1' },
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
    dispute: {
      findUnique: async ({ where }) => disputes.get(where.id) || null,
    },
    chatConversation: {
      findFirst: async ({ where }) => {
        for (const c of conversations.values()) {
          if (where.contextId && c.contextId !== where.contextId) continue;
          if (where.contextType && c.contextType !== where.contextType) continue;
          if (where.status && c.status !== where.status) continue;
          if (where.assignedStaffId === null && c.assignedStaffId !== null) continue;

          const matchP1 = where.OR?.some(
            (o) =>
              (o.participant1Id === c.participant1Id && o.participant2Id === c.participant2Id) ||
              (o.participant1Id === c.participant2Id && o.participant2Id === c.participant1Id) ||
              (o.assignedStaffId && o.assignedStaffId === c.assignedStaffId),
          );
          if (where.OR && !matchP1) continue;

          return c;
        }
        return null;
      },
      findUnique: async ({ where }) => conversations.get(where.id) || null,
      findMany: async ({ where }) => {
        return Array.from(conversations.values()).filter((c) => {
          if (where?.status && c.status !== where.status) return false;
          if (where?.assignedStaffId === null && c.assignedStaffId !== null) return false;
          if (where?.OR) {
            const matches = where.OR.some(
              (o) =>
                (o.participant1Id && o.participant1Id === c.participant1Id) ||
                (o.participant2Id && o.participant2Id === c.participant2Id) ||
                (o.assignedStaffId && o.assignedStaffId === c.assignedStaffId),
            );
            if (!matches) return false;
          }
          return true;
        });
      },
      count: async () => conversations.size,
      create: async ({ data }) => {
        const id = data.id || `conv-${conversations.size + 1}`;
        const record = {
          id,
          type: data.type || 'BUYER_SELLER',
          participant1Id: data.participant1Id,
          participant2Id: data.participant2Id || null,
          assignedStaffId: data.assignedStaffId || null,
          title: data.title || null,
          contextId: data.contextId || null,
          contextType: data.contextType || null,
          lastMessage: data.lastMessage || null,
          lastMessageAt: data.lastMessageAt || null,
          unreadCountUser1: 0,
          unreadCountUser2: 0,
          status: data.status || 'OPEN',
          createdAt: new Date(),
          updatedAt: new Date(),
          participant1: users.get(data.participant1Id),
          participant2: data.participant2Id ? users.get(data.participant2Id) : null,
          assignedStaff: data.assignedStaffId ? users.get(data.assignedStaffId) : null,
          messages: [],
        };
        conversations.set(id, record);
        return record;
      },
      update: async ({ where, data }) => {
        const c = conversations.get(where.id);
        if (!c) throw new Error('Not found');
        Object.assign(c, data);
        if (data.participant2Id) c.participant2 = users.get(data.participant2Id) || null;
        if (data.assignedStaffId) c.assignedStaff = users.get(data.assignedStaffId) || null;
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
      count: async () => autoReplies.size,
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
  const queueService = new StaffQueueService(createFakeRedis());
  const chatService = new ChatService(prisma, mockCloudinary, autoReplyService, queueService, {
    message() {},
    read() {},
    toUser() {},
    toStaff() {},
    statusChange() {},
    isUserOnline: async () => false,
    isStaffOnline: async () => false,
    isSupportOnline: async () => false,
  });

  const dto = CreateConversationSchema.parse({ participantId: 'admin-1' });

  await assert.rejects(
    async () => chatService.createOrGetConversation('buyer-1', 'BUYER', dto),
    (err) => err instanceof BadRequestException && err.message.includes('Quản trị viên'),
  );
});

test('Chat Module: Chặn Staff tự ý tạo hội thoại trực tiếp với khách hàng', async () => {
  const prisma = createMockPrisma();
  const autoReplyService = new ChatAutoReplyService(prisma);
  const queueService = new StaffQueueService(createFakeRedis());
  const chatService = new ChatService(prisma, mockCloudinary, autoReplyService, queueService, {
    message() {},
    read() {},
    toUser() {},
    toStaff() {},
    statusChange() {},
    isUserOnline: async () => false,
    isStaffOnline: async () => false,
    isSupportOnline: async () => false,
  });

  const dto = CreateConversationSchema.parse({ participantId: 'buyer-1' });

  await assert.rejects(
    async () => chatService.createOrGetConversation('staff-1', 'SUPPORT_STAFF', dto),
    (err) => err instanceof ForbiddenException && err.message.includes('chỉ có thể phản hồi'),
  );
});

test('Chat Module: Chặn gửi tin nhắn chứa từ ngữ cấm hoặc nhạy cảm', async () => {
  const prisma = createMockPrisma();
  const autoReplyService = new ChatAutoReplyService(prisma);
  const queueService = new StaffQueueService(createFakeRedis());
  const chatService = new ChatService(prisma, mockCloudinary, autoReplyService, queueService, {
    message() {},
    read() {},
    toUser() {},
    toStaff() {},
    statusChange() {},
    isUserOnline: async () => false,
    isStaffOnline: async () => false,
    isSupportOnline: async () => false,
  });

  const conv = await prisma.chatConversation.create({
    data: { participant1Id: 'buyer-1', participant2Id: 'seller-1' },
  });

  const sendDto = SendMessageSchema.parse({
    conversationId: conv.id,
    content: 'Tôi muốn mua súng đạn và vũ khí cấm',
  });

  await assert.rejects(
    async () => chatService.sendMessage('buyer-1', 'BUYER', sendDto),
    (err) => err instanceof BadRequestException && err.message.includes('nhạy cảm'),
  );
});

test('Chat Module: Phân phối ticket cho Staff online sớm nhất khi có 3 Staff cùng online', async () => {
  const prisma = createMockPrisma();
  const autoReplyService = new ChatAutoReplyService(prisma);
  const queueService = new StaffQueueService(createFakeRedis());
  const chatService = new ChatService(prisma, mockCloudinary, autoReplyService, queueService, {
    message() {},
    read() {},
    toUser() {},
    toStaff() {},
    statusChange() {},
    isUserOnline: async () => false,
    isStaffOnline: async () => false,
    isSupportOnline: async () => false,
  });

  // Giả lập 3 staff online vào các thời điểm khác nhau:
  // Staff 1 online lúc T0
  await queueService.registerOnlineStaff('staff-1', 'socket-1');
  // Staff 2 online lúc T0 + 10s
  await queueService.registerOnlineStaff('staff-2', 'socket-2');
  // Staff 3 online lúc T0 + 20s
  await queueService.registerOnlineStaff('staff-3', 'socket-3');

  // Đảm bảo danh sách online được sắp xếp theo thời điểm vào sớm nhất
  const onlineList = await queueService.getOnlineStaffList();
  assert.equal(onlineList.length, 3);
  assert.equal(onlineList[0].staffId, 'staff-1');
  assert.equal(onlineList[1].staffId, 'staff-2');
  assert.equal(onlineList[2].staffId, 'staff-3');

  // Buyer gửi yêu cầu hỗ trợ mới
  const reqDto = RequestSupportSchema.parse({
    subject: 'Cần hỗ trợ về thanh toán PayOS',
    message: 'Tôi quét mã QR nhưng đơn hàng chưa cập nhật thành công.',
  });

  const conv = await chatService.requestSupport('buyer-1', 'BUYER', reqDto);

  // Vì Staff 1 là người online sớm nhất, ticket phải được tự động gán cho Staff 1!
  assert.equal(conv.status, 'IN_PROGRESS');
  assert.equal(conv.assignedStaffId, 'staff-1');
  assert.equal(conv.participant2Id, 'staff-1');
});

test('Chat Module: Đảm bảo mỗi khiếu nại (Dispute) chỉ tạo DUY NHẤT một hội thoại', async () => {
  const prisma = createMockPrisma();
  const autoReplyService = new ChatAutoReplyService(prisma);
  const queueService = new StaffQueueService(createFakeRedis());
  const chatService = new ChatService(prisma, mockCloudinary, autoReplyService, queueService, {
    message() {},
    read() {},
    toUser() {},
    toStaff() {},
    statusChange() {},
    isUserOnline: async () => false,
    isStaffOnline: async () => false,
    isSupportOnline: async () => false,
  });

  // 1. Tạo hội thoại lần đầu cho dispute-101
  const conv1 = await chatService.getOrCreateDisputeConversation('dispute-101', 'buyer-1', 'BUYER');
  assert.ok(conv1.id);
  assert.equal(conv1.contextId, 'dispute-101');
  assert.equal(conv1.contextType, 'DISPUTE');

  // 2. Buyer hoặc Seller gọi lại lần 2 cho cùng dispute-101
  const conv2 = await chatService.getOrCreateDisputeConversation('dispute-101', 'buyer-1', 'BUYER');

  // Phải trả về chính xác cùng 1 ID hội thoại, không tạo mới bản ghi
  assert.equal(conv1.id, conv2.id);
});

test('Chat Module: Bỏ chat chung - Staff B không thấy hội thoại được gán cho Staff A', async () => {
  const prisma = createMockPrisma();
  const autoReplyService = new ChatAutoReplyService(prisma);
  const queueService = new StaffQueueService(createFakeRedis());
  const chatService = new ChatService(prisma, mockCloudinary, autoReplyService, queueService, {
    message() {},
    read() {},
    toUser() {},
    toStaff() {},
    statusChange() {},
    isUserOnline: async () => false,
    isStaffOnline: async () => false,
    isSupportOnline: async () => false,
  });

  // Tạo hội thoại gán riêng cho Staff A
  await prisma.chatConversation.create({
    data: {
      participant1Id: 'buyer-1',
      participant2Id: 'staff-1',
      assignedStaffId: 'staff-1',
      status: 'IN_PROGRESS',
      title: 'Hỗ trợ khách hàng VIP',
    },
  });

  // Staff A xem danh sách -> Thấy cuộc hội thoại
  const staffAList = await chatService.listUserConversations('staff-1', 'SUPPORT_STAFF', {});
  assert.equal(staffAList.items.length, 1);

  // Staff B xem danh sách -> KHÔNG thấy (Đã loại bỏ hoàn toàn chat chung)
  const staffBList = await chatService.listUserConversations('staff-2', 'SUPPORT_STAFF', {});
  assert.equal(staffBList.items.length, 0);
});

test('Chat Module: Ẩn danh nhân viên với User thành "Nhân viên Hỗ trợ", Admin thấy đầy đủ tên thật', async () => {
  const prisma = createMockPrisma();
  const autoReplyService = new ChatAutoReplyService(prisma);
  const queueService = new StaffQueueService(createFakeRedis());
  const chatService = new ChatService(prisma, mockCloudinary, autoReplyService, queueService, {
    message() {},
    read() {},
    toUser() {},
    toStaff() {},
    statusChange() {},
    isUserOnline: async () => false,
    isStaffOnline: async () => false,
    isSupportOnline: async () => false,
  });

  const conv = await prisma.chatConversation.create({
    data: {
      participant1Id: 'buyer-1',
      participant2Id: 'staff-1',
      assignedStaffId: 'staff-1',
      status: 'IN_PROGRESS',
    },
  });

  // Staff A gửi tin nhắn cho khách
  await chatService.sendMessage('staff-1', 'SUPPORT_STAFF', {
    conversationId: conv.id,
    content: 'Dạ em chào anh/chị, em xin phép hỗ trợ đơn hàng ạ.',
  });

  // 1. Buyer đọc tin nhắn -> Thấy tên hiển thị là "Nhân viên Hỗ trợ", ID là "SUPPORT_STAFF_DESK"
  const buyerMessages = await chatService.listMessages(conv.id, 'buyer-1', 'BUYER', {});
  assert.equal(buyerMessages.messages.length, 1);
  assert.equal(buyerMessages.messages[0].sender.fullName, 'Nhân viên Hỗ trợ');
  assert.equal(buyerMessages.messages[0].senderId, 'SUPPORT_STAFF_DESK');

  // 2. Admin đọc Audit -> Thấy chính xác tên thật của Staff A
  const adminMessages = await chatService.listMessages(conv.id, 'admin-1', 'ADMIN', {});
  assert.equal(adminMessages.messages[0].sender.fullName, 'Lê Staff A');
  assert.equal(adminMessages.messages[0].sender.id, 'staff-1');
});

test('Chat Module: Cập nhật vòng đời trạng thái ticket (OPEN -> IN_PROGRESS -> RESOLVED)', async () => {
  const prisma = createMockPrisma();
  const autoReplyService = new ChatAutoReplyService(prisma);
  const queueService = new StaffQueueService(createFakeRedis());
  const chatService = new ChatService(prisma, mockCloudinary, autoReplyService, queueService, {
    message() {},
    read() {},
    toUser() {},
    toStaff() {},
    statusChange() {},
    isUserOnline: async () => false,
    isStaffOnline: async () => false,
    isSupportOnline: async () => false,
  });

  // Tạo ticket ở trạng thái OPEN trong hàng đợi
  const conv = await prisma.chatConversation.create({
    data: {
      participant1Id: 'buyer-1',
      participant2Id: null,
      assignedStaffId: null,
      status: 'OPEN',
      title: 'Ticket chờ hỗ trợ',
    },
  });
  assert.equal(conv.status, 'OPEN');

  // Staff 1 bấm nhận ticket (claim)
  const claimed = await chatService.claimConversation(conv.id, 'staff-1', 'SUPPORT_STAFF');
  assert.equal(claimed.status, 'IN_PROGRESS');
  assert.equal(claimed.assignedStaffId, 'staff-1');

  // Staff 1 giải quyết xong và đóng ticket (RESOLVED)
  const updateDto = UpdateConversationStatusSchema.parse({
    status: TicketLifecycleStatus.RESOLVED,
    resolutionNotes: 'Đã hoàn tất hỗ trợ khách hàng.',
  });

  const resolved = await chatService.updateConversationStatus(
    conv.id,
    'staff-1',
    'SUPPORT_STAFF',
    updateDto,
  );
  assert.equal(resolved.status, 'RESOLVED');
});
