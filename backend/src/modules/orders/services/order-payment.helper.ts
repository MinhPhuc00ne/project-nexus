import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannel,
  NotificationType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import { WebhookData } from '@payos/node';
import { PayosSettlement } from '../../payments/services/payos-settlement';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { TreasuryService } from '../../treasury/services/treasury.service';
import { InventoryService } from '../../catalog/services/inventory.service';
import { ProductTrendingService } from '../../catalog/services/product-trending.service';
import { PayOrderInput } from '../dtos/pay-order.dto';
import { OrderEscrowService } from './order-escrow.service';
import { PayosOrderCodeService } from '../../payments/services/payos-order-code.service';
import { PayosService } from '../../payments/services/payos.service';
import { RefundService } from '../../after-sales/services/refund.service';

export interface PayosPaymentResponse {
  orderId: string;
  orderCode: number;
  paymentId: string;
  checkoutUrl: string;
  qrCode: string;
  accountNumber: string;
  accountName: string;
  bin: string;
  amount: Prisma.Decimal | number;
  description: string;
}

export interface PayosGroupPaymentResponse {
  orderIds: string[];
  paymentGroupId: string;
  orderCode: number;
  checkoutUrl: string;
  qrCode: string;
  accountNumber: string;
  accountName: string;
  bin: string;
  amount: number;
  description: string;
}

export interface WalletPaymentResponse {
  success: boolean;
  message: string;
  orderId: string;
  orderStatus: OrderStatus;
  provider: PaymentProvider;
  amount: Prisma.Decimal | number;
  wallet: {
    walletId: string;
    balanceBefore: number;
    balanceAfter: number;
    transactionId: string;
    platformFeeDeducted: number;
    sellerPayout: number;
    escrowStatus: string;
  };
}

@Injectable()
export class OrderPaymentHelper {
  private readonly logger = new Logger('OrderService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly payosService: PayosService,
    private readonly orderCodes: PayosOrderCodeService,
    private readonly configService: ConfigService,
    private readonly escrow: OrderEscrowService,
    private readonly inventoryService?: InventoryService,
    private readonly refunds?: RefundService,
    private readonly treasury?: TreasuryService,
    private readonly trendingService?: ProductTrendingService,
  ) {}

  private async syncTrendingSafely(): Promise<void> {
    if (!this.trendingService) return;
    try {
      await this.trendingService.syncTopTrendingNotifications();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Đồng bộ thông báo Xu hướng thất bại: ${message}`);
    }
  }

  /**
   * Khởi tạo giao dịch thanh toán cho đơn hàng (Hỗ trợ PayOS VietQR, Ví NEXUS Pay và COD).
   */
  async initializePayment(
    orderId: string,
    buyerId: string,
    dto?: PayOrderInput,
  ): Promise<
    | PayosPaymentResponse
    | WalletPaymentResponse
    | { orderId: string; success: boolean; message: string; provider: PaymentProvider }
  > {
    const provider = dto?.provider || PaymentProvider.PAYOS;

    // 1. Nếu chọn thanh toán bằng VÍ (WALLET)
    if (provider === PaymentProvider.WALLET) {
      return this.payOrderByWallet(orderId, buyerId);
    }

    // 2. Nếu chọn thanh toán khi nhận hàng (COD)
    if (provider === PaymentProvider.COD) {
      return this.registerCodPayment(orderId, buyerId);
    }

    // 3. Nếu chọn cổng thanh toán khác ngoài PAYOS
    if (provider !== PaymentProvider.PAYOS) {
      throw new BadRequestException(`Cổng thanh toán ${provider} hiện chưa được kích hoạt`);
    }

    // 3. Xử lý cổng PayOS VietQR
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        buyer: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng tương ứng');
    }

    if (order.isAuction)
      throw new BadRequestException(
        'Đơn đấu giá phải thanh toán qua quyền mua, để sử dụng đúng tiền cọc.',
      );

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Bạn không có quyền thanh toán cho đơn hàng này');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Đơn hàng hiện không ở trạng thái chờ thanh toán (Trạng thái hiện tại: ${order.status})`,
      );
    }

    // PayOS requires an integer nobody has used before. A clock plus a random
    // suffix cannot promise that; a sequence can.
    const orderCode = await this.orderCodes.next();

    const amount = Math.round(Number(order.totalAmount));
    if (amount <= 0) {
      throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0 đồng');
    }

    const description = `Nexus DH${orderCode}`.slice(0, 25);

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173';

    const returnUrl =
      dto?.returnUrl || `${frontendUrl}/payment/success?orderId=${order.id}&orderCode=${orderCode}`;
    const cancelUrl =
      dto?.cancelUrl || `${frontendUrl}/payment/cancel?orderId=${order.id}&orderCode=${orderCode}`;

    // Chuẩn bị danh sách sản phẩm hiển thị trên PayOS checkout
    const items = order.items.map((item) => ({
      name: (item.product?.title ?? item.titleSnapshot ?? 'Sản phẩm đấu giá').slice(0, 50),
      quantity: item.quantity,
      price: Math.round(Number(item.unitPrice)),
    }));

    const addressSnapshot = (
      order.shippingAddressSnapshot && typeof order.shippingAddressSnapshot === 'object'
        ? order.shippingAddressSnapshot
        : {}
    ) as Record<string, string>;

    // Gọi SDK PayOS để tạo link thanh toán
    const paymentLink = await this.payosService.createPaymentLink({
      orderCode,
      amount,
      description,
      returnUrl,
      cancelUrl,
      items,
      buyerName: addressSnapshot?.recipientName || order.buyer?.fullName || undefined,
      buyerEmail: order.buyer?.email || undefined,
      buyerPhone: addressSnapshot?.phone || order.buyer?.phoneNumber || undefined,
      buyerAddress: addressSnapshot?.street
        ? `${addressSnapshot.street}, ${addressSnapshot.city || ''}`
        : undefined,
    });

    // Lưu bản ghi Payment ở trạng thái PENDING
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: PaymentProvider.PAYOS,
        amount: order.totalAmount,
        status: PaymentStatus.PENDING,
        transactionCode: String(orderCode),
        metadata: {
          orderCode,
          paymentLinkId: paymentLink.paymentLinkId,
          checkoutUrl: paymentLink.checkoutUrl,
          qrCode: paymentLink.qrCode,
          accountNumber: paymentLink.accountNumber,
          accountName: paymentLink.accountName,
          bin: paymentLink.bin,
        },
      },
    });

    return {
      orderId: order.id,
      orderCode,
      paymentId: payment.id,
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
      accountNumber: paymentLink.accountNumber,
      accountName: paymentLink.accountName,
      bin: paymentLink.bin,
      amount: order.totalAmount,
      description,
    };
  }

  /**
   * Xử lý thanh toán đơn hàng bằng số dư ví cá nhân (NEXUS Pay Wallet)
   */
  async payOrderByWallet(orderId: string, buyerId: string): Promise<WalletPaymentResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        seller: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng tương ứng');
    }

    if (order.isAuction)
      throw new BadRequestException(
        'Đơn đấu giá phải thanh toán qua quyền mua, để sử dụng đúng tiền cọc.',
      );

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Bạn không có quyền thanh toán cho đơn hàng này');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Đơn hàng hiện không ở trạng thái chờ thanh toán (Trạng thái hiện tại: ${order.status})`,
      );
    }

    const orderAmount = Number(order.totalAmount);
    if (orderAmount <= 0) {
      throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0 đồng');
    }

    // Thực thi toàn bộ trong transaction an toàn
    const settlementResult = await this.prisma.$transaction((tx) =>
      this.debitWalletForOrder(tx, order.id, buyerId),
    );

    void this.syncTrendingSafely();

    return {
      success: true,
      message: 'Thanh toán đơn hàng bằng ví NEXUS Pay thành công!',
      orderId: order.id,
      orderStatus: OrderStatus.PAID,
      provider: PaymentProvider.WALLET,
      amount: order.totalAmount,
      wallet: {
        walletId: settlementResult.updatedBuyerWallet.id,
        balanceBefore: Number(settlementResult.updatedBuyerWallet.balance) + orderAmount,
        balanceAfter: Number(settlementResult.updatedBuyerWallet.balance),
        transactionId: settlementResult.buyerTx.id,
        platformFeeDeducted: settlementResult.settlement.platformFee,
        sellerPayout: settlementResult.settlement.sellerPayout,
        escrowStatus: settlementResult.settlement.escrowStatus,
      },
    };
  }

  /**
   * Creates one PayOS link covering several orders.
   *
   * A cart holding items from two shops becomes two orders, because an order is
   * what one seller packs and ships — but the buyer transfers once. Checkout
   * used to guard its whole payment step with `createdOrders.length === 1`, so
   * a multi-shop cart ended with two orders in PENDING_PAYMENT and no link to
   * pay either of them.
   *
   * The group owns the order code PayOS settles against; the per-order payment
   * rows are written when the callback arrives, which is what escrow, refunds
   * and the seller payout read.
   *
   * @param orderIds - The orders this one transfer covers.
   * @param buyerId - Who is paying; every order must be theirs.
   * @param dto - Where PayOS should send the buyer back to.
   * @returns The link, the code, and the orders it covers.
   */
  async initializeGroupPayment(
    orderIds: string[],
    buyerId: string,
    dto?: PayOrderInput,
  ): Promise<PayosGroupPaymentResponse> {
    if (orderIds.length < 2)
      throw new BadRequestException('Nhóm thanh toán cần ít nhất hai đơn hàng.');

    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: {
        buyer: true,
        items: { include: { product: { select: { title: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (orders.length !== orderIds.length)
      throw new NotFoundException('Không tìm thấy đủ các đơn hàng của nhóm thanh toán.');

    for (const order of orders) {
      if (order.buyerId !== buyerId)
        throw new ForbiddenException('Bạn không có quyền thanh toán cho đơn hàng này');
      if (order.isAuction)
        throw new BadRequestException(
          'Đơn đấu giá phải thanh toán qua quyền mua, để sử dụng đúng tiền cọc.',
        );
      if (order.status !== OrderStatus.PENDING_PAYMENT)
        throw new BadRequestException(
          `Đơn hàng ${order.id.slice(0, 8).toUpperCase()} không ở trạng thái chờ thanh toán (${order.status})`,
        );
      if (order.paymentGroupId)
        throw new BadRequestException('Đơn hàng đã thuộc một nhóm thanh toán khác.');
    }

    const amount = orders.reduce((sum, order) => sum + Math.round(Number(order.totalAmount)), 0);
    if (amount <= 0) throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0 đồng');

    const orderCode = await this.orderCodes.next();
    const description = `Nexus GH${orderCode}`.slice(0, 25);

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173';
    const returnUrl = dto?.returnUrl || `${frontendUrl}/payment/success?orderCode=${orderCode}`;
    const cancelUrl = dto?.cancelUrl || `${frontendUrl}/payment/cancel?orderCode=${orderCode}`;

    const buyer = orders[0].buyer;
    const addressSnapshot = (
      orders[0].shippingAddressSnapshot && typeof orders[0].shippingAddressSnapshot === 'object'
        ? orders[0].shippingAddressSnapshot
        : {}
    ) as Record<string, string>;

    // PayOS shows these lines to the buyer, so they are the products across
    // every order in the group, not one order's.
    const items = orders.flatMap((order) =>
      order.items.map((item) => ({
        name: (item.product?.title ?? item.titleSnapshot ?? 'Sản phẩm').slice(0, 50),
        quantity: item.quantity,
        price: Math.round(Number(item.unitPrice)),
      })),
    );

    const paymentLink = await this.payosService.createPaymentLink({
      orderCode,
      amount,
      description,
      returnUrl,
      cancelUrl,
      items,
      buyerName: addressSnapshot?.recipientName || buyer?.fullName || undefined,
      buyerEmail: buyer?.email || undefined,
      buyerPhone: addressSnapshot?.phone || buyer?.phoneNumber || undefined,
      buyerAddress: addressSnapshot?.street
        ? `${addressSnapshot.street}, ${addressSnapshot.city || ''}`
        : undefined,
    });

    const group = await this.prisma.$transaction(async (tx) => {
      const created = await tx.paymentGroup.create({
        data: {
          buyerId,
          orderCode: String(orderCode),
          amount,
          status: PaymentStatus.PENDING,
          metadata: {
            orderCode,
            paymentLinkId: paymentLink.paymentLinkId,
            checkoutUrl: paymentLink.checkoutUrl,
            qrCode: paymentLink.qrCode,
            accountNumber: paymentLink.accountNumber,
            accountName: paymentLink.accountName,
            bin: paymentLink.bin,
          } as Prisma.InputJsonValue,
        },
      });

      // Only orders still waiting and not already grouped: a cancellation or a
      // second checkout between the lookup and here must not be swept in.
      const joined = await tx.order.updateMany({
        where: {
          id: { in: orderIds },
          buyerId,
          status: OrderStatus.PENDING_PAYMENT,
          paymentGroupId: null,
        },
        data: { paymentGroupId: created.id },
      });
      if (joined.count !== orderIds.length)
        throw new BadRequestException(
          'Một trong các đơn hàng đã thay đổi trạng thái; vui lòng thanh toán lại.',
        );

      return created;
    });

    return {
      orderIds: orders.map((order) => order.id),
      paymentGroupId: group.id,
      orderCode,
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
      accountNumber: paymentLink.accountNumber,
      accountName: paymentLink.accountName,
      bin: paymentLink.bin,
      amount,
      description,
    };
  }

  /**
   * Pays for several orders out of the buyer's wallet, all or nothing.
   *
   * One transaction, so a buyer whose balance covers the first order but not
   * the second ends up having paid for neither, rather than for one of them.
   *
   * @param orderIds - The orders to pay for.
   * @param buyerId - Whose wallet to debit.
   * @returns One result per order, in the order they were paid.
   */
  async payOrdersByWallet(orderIds: string[], buyerId: string): Promise<WalletPaymentResponse[]> {
    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds } },
      orderBy: { createdAt: 'asc' },
    });

    if (orders.length !== orderIds.length)
      throw new NotFoundException('Không tìm thấy đủ các đơn hàng cần thanh toán.');

    for (const order of orders) {
      if (order.buyerId !== buyerId)
        throw new ForbiddenException('Bạn không có quyền thanh toán cho đơn hàng này');
      if (order.isAuction)
        throw new BadRequestException(
          'Đơn đấu giá phải thanh toán qua quyền mua, để sử dụng đúng tiền cọc.',
        );
    }

    const settlements = await this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const order of orders) {
        results.push({
          orderId: order.id,
          settlement: await this.debitWalletForOrder(tx, order.id, buyerId),
        });
      }
      return results;
    });

    void this.syncTrendingSafely();

    return settlements.map(({ orderId, settlement }) => ({
      success: true,
      message: 'Thanh toán đơn hàng bằng ví NEXUS Pay thành công!',
      orderId,
      orderStatus: OrderStatus.PAID,
      provider: PaymentProvider.WALLET,
      amount: settlement.updatedOrder.totalAmount,
      wallet: {
        walletId: settlement.updatedBuyerWallet.id,
        balanceBefore: settlement.currentBalance,
        balanceAfter: Number(settlement.updatedBuyerWallet.balance),
        transactionId: settlement.buyerTx.id,
        platformFeeDeducted: settlement.settlement.platformFee,
        sellerPayout: settlement.settlement.sellerPayout,
        escrowStatus: settlement.settlement.escrowStatus,
      },
    }));
  }
  /**
   * Registers cash on delivery (COD) payment for an order.
   *
   * @param orderId Target order identifier
   * @param buyerId Buyer account identifier verifying ownership
   * @returns Payment registration confirmation
   */

  /**
   * Takes one order's total out of the buyer's wallet and puts it in escrow.
   *
   * Factored out of `payOrderByWallet` so that paying for several orders at
   * once — a cart with items from two shops becomes two orders — happens in a
   * single transaction. Called once per order it would debit the wallet, mark
   * the order paid, commit its stock and notify both sides; doing that in
   * separate transactions could leave the buyer with the first order paid and
   * the second refused for insufficient funds.
   *
   * @param tx - The transaction to do the work in.
   * @param orderId - Which order to settle.
   * @param buyerId - Whose wallet to debit; checked against the order.
   * @returns What was settled, for the caller's response.
   */
  private async debitWalletForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    buyerId: string,
  ) {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
    const payable = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    // Checked again inside the lock: the caller validated it, but this debits
    // a wallet and must not rely on having been called correctly.
    if (payable.buyerId !== buyerId)
      throw new ForbiddenException('Bạn không có quyền thanh toán cho đơn hàng này');
    if (payable.status !== OrderStatus.PENDING_PAYMENT)
      throw new BadRequestException('Đơn hàng đã được thanh toán hoặc không còn chờ thanh toán.');
    // 1. Kiểm tra ví người mua (tạo mới nếu chưa có)
    let buyerWallet = await tx.wallet.findUnique({
      where: { userId: buyerId },
    });

    if (!buyerWallet) {
      buyerWallet = await tx.wallet.create({
        data: {
          userId: buyerId,
          balance: 0,
          lockedBalance: 0,
          currency: 'VND',
        },
      });
    }

    const orderAmount = Number(payable.totalAmount);
    const currentBalance = Number(buyerWallet.balance);
    if (currentBalance < orderAmount) {
      throw new BadRequestException(
        `Số dư ví NEXUS Pay không đủ để thanh toán. Số dư hiện tại: ${currentBalance.toLocaleString('vi-VN')} VND, Cần thanh toán: ${orderAmount.toLocaleString('vi-VN')} VND. Vui lòng nạp thêm tiền vào ví hoặc chọn phương thức chuyển khoản VietQR.`,
      );
    }

    // 2. Trừ tiền ví người mua
    const debited = await tx.wallet.updateMany({
      where: { id: buyerWallet.id, balance: { gte: payable.totalAmount } },
      data: { balance: { decrement: payable.totalAmount } },
    });
    if (debited.count !== 1) throw new BadRequestException('Số dư ví không đủ để thanh toán.');
    const updatedBuyerWallet = await tx.wallet.findUniqueOrThrow({
      where: { id: buyerWallet.id },
    });

    // 3. Ghi lịch sử giao dịch cho người mua (ORDER_PAYMENT)
    const buyerTx = await tx.walletTransaction.create({
      data: {
        walletId: buyerWallet.id,
        amount: payable.totalAmount,
        type: WalletTransactionType.ORDER_PAYMENT,
        status: WalletTransactionStatus.SUCCESS,
        referenceId: orderId,
        description: `Thanh toán đơn hàng #${orderId.slice(0, 8).toUpperCase()}`,
      },
    });

    // 4. Lưu bản ghi Payment
    await tx.payment.create({
      data: {
        orderId,
        provider: PaymentProvider.WALLET,
        amount: payable.totalAmount,
        status: PaymentStatus.SUCCESS,
        transactionCode: `WAL-${Date.now()}-${orderId.slice(0, 8).toUpperCase()}`,
        metadata: {
          paidByWallet: true,
          buyerWalletId: buyerWallet.id,
          buyerTransactionId: buyerTx.id,
          paidAt: new Date().toISOString(),
        },
      },
    });

    // 5. Cập nhật trạng thái đơn hàng sang PAID
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID },
      include: {
        buyer: true,
        seller: true,
      },
    });

    // 6. Trừ kho vĩnh viễn khi thanh toán thành công
    if (this.inventoryService) {
      await this.inventoryService.commitReservation(tx, orderId);
    }

    // Keep funds in escrow until verified delivery and buyer confirmation.
    const settlement = await this.escrow.hold(tx, updatedOrder);

    // 7. Gửi thông báo cho người mua và người bán
    await tx.notification.create({
      data: {
        userId: buyerId,
        title: 'Thanh toán đơn hàng thành công ✅',
        content: `Đơn hàng #${orderId.slice(0, 8).toUpperCase()} trị giá ${orderAmount.toLocaleString('vi-VN')} VND đã được thanh toán thành công bằng ví NEXUS Pay. Số dư còn lại: ${Number(updatedBuyerWallet.balance).toLocaleString('vi-VN')} VND.`,
        type: NotificationType.ORDER,
        channel: NotificationChannel.IN_APP,
      },
    });

    await tx.notification.create({
      data: {
        userId: payable.sellerId,
        title: 'Đơn hàng mới đã được thanh toán 🛒',
        content: `Đơn hàng #${orderId.slice(0, 8).toUpperCase()} đã được thanh toán thành công và chuyển sang trạng thái chuẩn bị. Vui lòng đóng gói và bàn giao cho đơn vị vận chuyển GHN.`,
        type: NotificationType.ORDER,
        channel: NotificationChannel.IN_APP,
      },
    });

    return {
      updatedOrder,
      buyerTx,
      currentBalance,
      updatedBuyerWallet,
      settlement,
    };
  }

  async registerCodPayment(
    orderId: string,
    buyerId: string,
  ): Promise<{ orderId: string; success: boolean; message: string; provider: PaymentProvider }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng tương ứng');
    }

    if (order.isAuction)
      throw new BadRequestException(
        'Đơn đấu giá phải thanh toán qua quyền mua, để sử dụng đúng tiền cọc.',
      );

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Bạn không có quyền thao tác trên đơn hàng này');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Không thể ghi nhận thanh toán COD cho đơn hàng ở trạng thái '${order.status}'.`,
      );
    }

    const hasSuccessfulPayment = order.payments.some((p) => p.status === PaymentStatus.SUCCESS);
    if (hasSuccessfulPayment) {
      throw new BadRequestException('Đơn hàng đã được thanh toán thành công trước đó.');
    }

    const existingCod = order.payments.find((p) => p.provider === PaymentProvider.COD);
    if (!existingCod) {
      await this.prisma.payment.create({
        data: {
          orderId,
          provider: PaymentProvider.COD,
          amount: order.totalAmount,
          status: PaymentStatus.PENDING,
          metadata: { note: 'Thanh toán tiền mặt khi nhận hàng (COD)' },
        },
      });
    }

    return {
      orderId,
      success: true,
      message: 'Phương thức thanh toán COD đã được ghi nhận thành công.',
      provider: PaymentProvider.COD,
    };
  }

  /**
   * Settles a verified PayOS callback, against one order or against a group.
   *
   * The same callback shape arrives for an order payment, for a payment that
   * covers several orders at once, and for a wallet top-up; the only thing
   * telling them apart is which record carries the order code. Returning null
   * rather than throwing says "this is not mine", so the caller can offer it to
   * the wallet instead. Verification happens once, before any of them is asked.
   *
   * @param webhookData - The already-verified callback payload.
   * @returns The settlement, or null when nothing here carries this order code.
   */
  async settleOrderPayment(webhookData: WebhookData): Promise<PayosSettlement | null> {
    const { orderCode, code } = webhookData;

    this.logger.log(`Nhận Webhook PayOS cho orderCode=${orderCode}, status code=${code}`);

    // Anything but '00' is PayOS reporting that no money moved.
    if (code !== '00') return { success: true, orderCode };

    const payment = await this.prisma.payment.findFirst({
      where: {
        transactionCode: String(orderCode),
        provider: PaymentProvider.PAYOS,
      },
    });

    if (payment) {
      if (payment.status === PaymentStatus.SUCCESS) {
        this.logger.log(`Giao dịch PayOS orderCode=${orderCode} đã được xử lý trước đó`);
        return { success: true, message: 'Already processed' };
      }

      if (Number(webhookData.amount) !== Number(payment.amount))
        throw new BadRequestException('Số tiền PayOS không khớp đơn hàng.');

      await this.prisma.$transaction((tx) => this.settlePaidOrder(tx, payment.id, { webhookData }));

      this.logger.log(`Đơn ${payment.orderId} đã thanh toán PayOS; tiền được giữ ký quỹ.`);
      void this.syncTrendingSafely();
      return { success: true, orderCode };
    }

    const group = await this.prisma.paymentGroup.findUnique({
      where: { orderCode: String(orderCode) },
      include: { orders: { select: { id: true, totalAmount: true } } },
    });

    if (!group) {
      // Nothing here carries this order code, so the transfer is not for an
      // order. A wallet top-up uses the same callback, and the caller tries
      // that next.
      return null;
    }

    if (group.status === PaymentStatus.SUCCESS) {
      this.logger.log(`Nhóm thanh toán PayOS orderCode=${orderCode} đã được xử lý trước đó`);
      return { success: true, message: 'Already processed' };
    }

    if (Number(webhookData.amount) !== Number(group.amount))
      throw new BadRequestException('Số tiền PayOS không khớp nhóm đơn hàng.');

    await this.settleGroupOrders(group.id, { webhookData });

    this.logger.log(
      `Nhóm ${group.id} (${group.orders.length} đơn) đã thanh toán PayOS; tiền được giữ ký quỹ.`,
    );
    void this.syncTrendingSafely();
    return { success: true, orderCode };
  }

  /**
   * Marks every order in a payment group paid, once.
   *
   * The group owns the PayOS order code, so this is reached two ways: the
   * callback arriving, and the buyer's client asking whether the link was paid
   * while the callback is late or lost. Both end here, inside one transaction
   * that locks the group, so a group is never paid twice and never half paid.
   *
   * @param groupId - Which group.
   * @param audit - What proved the payment, kept on each payment row.
   * @returns True when this call settled it, false when it already was.
   */
  private async settleGroupOrders(
    groupId: string,
    audit: Record<string, unknown>,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // Two deliveries of the same callback would otherwise each pay every
      // order in the group.
      await tx.$queryRaw`SELECT id FROM payment_groups WHERE id = ${groupId} FOR UPDATE`;
      const current = await tx.paymentGroup.findUniqueOrThrow({
        where: { id: groupId },
        include: { orders: { select: { id: true, totalAmount: true } } },
      });
      if (current.status === PaymentStatus.SUCCESS) return false;

      for (const order of current.orders) {
        // Each order gets its own payment row: that is what escrow, refunds
        // and the seller payout read, and one order of a group can be
        // cancelled or refunded without the others.
        const orderPayment = await tx.payment.create({
          data: {
            orderId: order.id,
            provider: PaymentProvider.PAYOS,
            amount: order.totalAmount,
            status: PaymentStatus.PENDING,
            metadata: {
              paymentGroupId: current.id,
              orderCode: Number(current.orderCode),
            } as Prisma.InputJsonValue,
          },
        });
        await this.settlePaidOrder(tx, orderPayment.id, audit);
      }

      await tx.paymentGroup.update({
        where: { id: current.id },
        data: {
          status: PaymentStatus.SUCCESS,
          metadata: {
            ...((current.metadata && typeof current.metadata === 'object'
              ? current.metadata
              : {}) as Record<string, unknown>),
            ...audit,
            paidAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });

      return true;
    });
  }

  /**
   * Records one order as paid and puts its money in escrow.
   *
   * Factored out of the single-order callback so a payment covering several
   * orders settles each of them by the same rules, including the awkward one:
   * a verified transfer that lands after the buyer cancelled is still money
   * owed back, and must be recorded and reserved for refund rather than
   * reopening the order.
   *
   * The caller has already checked that the amount matches and holds the
   * transaction; this never checks amounts, because one order of a group is
   * only part of what the buyer transferred.
   *
   * @param tx - The transaction to do the work in.
   * @param paymentId - The payment row to settle.
   * @param audit - What proved the payment — the verified callback, or what
   *   PayOS answered when asked directly — kept on the payment row.
   */
  private async settlePaidOrder(
    tx: Prisma.TransactionClient,
    paymentId: string,
    audit: Record<string, unknown>,
  ): Promise<void> {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${payment.orderId} FOR UPDATE`;
    const currentPayment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (currentPayment.status === PaymentStatus.SUCCESS) return;

    const currentMetadata = (
      payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {}
    ) as Record<string, unknown>;

    const payable = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });

    if (payable.status === OrderStatus.CANCELLED && this.refunds && this.treasury) {
      // A verified transfer arriving after cancellation is still money owed to the buyer.
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          metadata: {
            ...currentMetadata,
            ...audit,
            paidAfterCancellation: true,
          } as Prisma.InputJsonValue,
        },
      });
      const escrowWallet = await this.treasury.getOrCreateEscrowWallet(tx);
      await tx.wallet.update({
        where: { id: escrowWallet.id },
        data: { balance: { increment: currentPayment.amount } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: escrowWallet.id,
          amount: currentPayment.amount,
          type: 'ESCROW_LOCK',
          status: 'SUCCESS',
          referenceId: payment.id,
          description: 'Ghi nhận thanh toán đến sau khi hủy đơn',
        },
      });
      await this.refunds.reserve(tx, {
        orderId: payable.id,
        buyerId: payable.buyerId,
        paymentId: payment.id,
        amount: currentPayment.amount,
        adminWalletId: escrowWallet.id,
        toWallet: false,
      });
      return;
    }

    if (payable.status !== OrderStatus.PENDING_PAYMENT)
      throw new BadRequestException(
        'Đơn đã thanh toán hoặc bị hủy; cần đối soát khoản thanh toán này.',
      );

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        metadata: {
          ...currentMetadata,
          ...audit,
          paidAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    const updatedOrder = await tx.order.update({
      where: { id: payment.orderId },
      data: {
        status: OrderStatus.PAID,
      },
      include: {
        buyer: true,
        seller: true,
      },
    });

    // Trừ kho vĩnh viễn khi PayOS thanh toán thành công
    if (this.inventoryService) {
      await this.inventoryService.commitReservation(tx, payment.orderId);
    }

    // Never disburse funds merely because the payment succeeded.
    await this.escrow.hold(tx, updatedOrder);

    if (tx.notification?.create) {
      await tx.notification.create({
        data: {
          userId: updatedOrder.buyerId,
          title: 'Thanh toán PayOS thành công ✅',
          content: `Đơn hàng #${updatedOrder.id.slice(0, 8).toUpperCase()} trị giá ${Number(payment.amount).toLocaleString('vi-VN')} VND đã được thanh toán thành công qua PayOS (VietQR). Tiền được giữ ký quỹ an toàn tại NEXUS Escrow.`,
          type: NotificationType.PAYMENT,
          channel: NotificationChannel.IN_APP,
        },
      });

      await tx.notification.create({
        data: {
          userId: updatedOrder.sellerId,
          title: 'Đơn hàng mới đã được thanh toán qua PayOS 🛒',
          content: `Đơn hàng #${updatedOrder.id.slice(0, 8).toUpperCase()} trị giá ${Number(payment.amount).toLocaleString('vi-VN')} VND đã được thanh toán qua VietQR. Vui lòng chuẩn bị và bàn giao cho đơn vị vận chuyển GHN.`,
          type: NotificationType.ORDER,
          channel: NotificationChannel.IN_APP,
        },
      });
    }
  }

  /**
   * Kiểm tra và tự động đồng bộ trạng thái thanh toán từ PayOS
   */
  async checkPayosPaymentStatus(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng tương ứng');
    }

    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem thông tin đơn hàng này');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return {
        paid: order.status !== OrderStatus.CANCELLED,
        status: order.status,
        message: 'Đơn hàng đã được thanh toán hoặc đang xử lý.',
      };
    }

    // An order paid as part of a group has no payment row of its own until the
    // money arrives: the group holds the code PayOS answers to. Asking about
    // the group covers a callback that is late or was never delivered.
    if (order.paymentGroupId && order.payments.length === 0) {
      const group = await this.prisma.paymentGroup.findUnique({
        where: { id: order.paymentGroupId },
      });
      if (!group) return { paid: false, status: order.status };
      if (group.status === PaymentStatus.SUCCESS) return { paid: true, status: order.status };

      try {
        const payosInfo = await this.payosService.getPaymentLink(Number(group.orderCode));
        if (
          payosInfo &&
          (payosInfo.status === 'PAID' || Number(payosInfo.amountPaid) >= Number(group.amount))
        ) {
          await this.settleGroupOrders(group.id, {
            payosStatus: payosInfo.status,
            verifiedDirectly: true,
          });
          void this.syncTrendingSafely();
          return {
            paid: true,
            status: OrderStatus.PAID,
            message: 'Nhóm đơn hàng đã được thanh toán và ghi nhận.',
          };
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Không kiểm tra được trạng thái nhóm thanh toán PayOS: ${message}`);
      }

      return { paid: false, status: order.status };
    }

    const payment = order.payments[0];
    if (!payment || payment.provider !== PaymentProvider.PAYOS || !payment.transactionCode) {
      return {
        paid: false,
        status: order.status,
      };
    }

    try {
      const orderCode = Number(payment.transactionCode);
      const payosInfo = await this.payosService.getPaymentLink(orderCode);

      if (
        payosInfo &&
        (payosInfo.status === 'PAID' || Number(payosInfo.amountPaid) >= Number(payment.amount))
      ) {
        await this.prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM orders WHERE id = ${order.id} FOR UPDATE`;
          const currentPayment = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
          if (currentPayment.status === PaymentStatus.SUCCESS) return;
          const payable = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
          if (payable.status !== OrderStatus.PENDING_PAYMENT) return;

          const currentMetadata = (
            payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {}
          ) as Record<string, unknown>;

          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.SUCCESS,
              metadata: {
                ...currentMetadata,
                payosStatus: payosInfo.status,
                verifiedDirectly: true,
                paidAt: new Date().toISOString(),
              } as Prisma.InputJsonValue,
            },
          });

          const updatedOrder = await tx.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.PAID,
            },
            include: {
              buyer: true,
              seller: true,
            },
          });

          if (this.inventoryService) {
            await this.inventoryService.commitReservation(tx, order.id);
          }

          await this.escrow.hold(tx, updatedOrder);
        });

        this.logger.log(
          `Đồng bộ trực tiếp: Đơn ${order.id} đã thanh toán PayOS; tiền được giữ ký quỹ.`,
        );
        void this.syncTrendingSafely();

        return {
          paid: true,
          status: OrderStatus.PAID,
          message: 'Thanh toán thành công qua PayOS VietQR.',
        };
      }

      return {
        paid: false,
        status: order.status,
        payosStatus: payosInfo?.status,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Truy vấn trạng thái PayOS cho đơn ${order.id} thất bại: ${message}`);
      return {
        paid: false,
        status: order.status,
      };
    }
  }
}
