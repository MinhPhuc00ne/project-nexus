import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';
import { WebhookData } from '@payos/node';
import { NotificationPublisher } from '../../../core/notifications/notification-publisher.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { RefundService } from '../../after-sales/services/refund.service';
import { InventoryService } from '../../catalog/services/inventory.service';
import { ProductTrendingService } from '../../catalog/services/product-trending.service';
import { PayosOrderCodeService } from '../../payments/services/payos-order-code.service';
import { PayosSettlement } from '../../payments/services/payos-settlement';
import { PayosService } from '../../payments/services/payos.service';
import { TreasuryService } from '../../treasury/services/treasury.service';
import { PayOrderInput } from '../dtos/pay-order.dto';
import { OrderEscrowService } from './order-escrow.service';
import {
  OrderPayosService,
  PayosGroupPaymentResponse,
  PayosPaymentResponse,
} from './order-payos.service';
import { OrderWalletPaymentService, WalletPaymentResponse } from './order-wallet-payment.service';

export type { PayosGroupPaymentResponse, PayosPaymentResponse, WalletPaymentResponse };

/**
 * Facade delegating retail order payments to `OrderPayosService` (PayOS VietQR)
 * and `OrderWalletPaymentService` (NEXUS Pay wallet & COD).
 */
@Injectable()
export class OrderPaymentHelper {
  private readonly fallbackPayos: OrderPayosService;
  private readonly fallbackWallet: OrderWalletPaymentService;

  constructor(
    prisma: PrismaService,
    payosService: PayosService,
    orderCodes: PayosOrderCodeService,
    configService: ConfigService,
    escrow: OrderEscrowService,
    inventoryService?: InventoryService,
    refunds?: RefundService,
    treasury?: TreasuryService,
    trendingService?: ProductTrendingService,
    @Optional() notifications?: NotificationPublisher,
    @Optional() private readonly payosPaymentService?: OrderPayosService,
    @Optional() private readonly walletPaymentService?: OrderWalletPaymentService,
  ) {
    this.fallbackPayos =
      payosPaymentService ??
      new OrderPayosService(
        prisma,
        payosService,
        orderCodes,
        configService,
        escrow,
        inventoryService,
        refunds,
        treasury,
        trendingService,
        notifications,
      );
    this.fallbackWallet =
      walletPaymentService ??
      new OrderWalletPaymentService(
        prisma,
        escrow,
        inventoryService,
        trendingService,
        notifications,
      );
  }

  private get payos(): OrderPayosService {
    return this.payosPaymentService ?? this.fallbackPayos;
  }

  private get wallet(): OrderWalletPaymentService {
    return this.walletPaymentService ?? this.fallbackWallet;
  }

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

    if (provider === PaymentProvider.WALLET) {
      return this.wallet.payOrderByWallet(orderId, buyerId);
    }

    if (provider === PaymentProvider.COD) {
      return this.wallet.registerCodPayment(orderId, buyerId);
    }

    if (provider !== PaymentProvider.PAYOS) {
      throw new BadRequestException(`Cổng thanh toán ${provider} hiện chưa được kích hoạt`);
    }

    return this.payos.initializePayosPayment(orderId, buyerId, dto);
  }

  async payOrderByWallet(orderId: string, buyerId: string): Promise<WalletPaymentResponse> {
    return this.wallet.payOrderByWallet(orderId, buyerId);
  }

  async initializeGroupPayment(
    orderIds: string[],
    buyerId: string,
    dto?: PayOrderInput,
  ): Promise<PayosGroupPaymentResponse> {
    return this.payos.initializeGroupPayment(orderIds, buyerId, dto);
  }

  async payOrdersByWallet(orderIds: string[], buyerId: string): Promise<WalletPaymentResponse[]> {
    return this.wallet.payOrdersByWallet(orderIds, buyerId);
  }

  async registerCodPayment(
    orderId: string,
    buyerId: string,
  ): Promise<{ orderId: string; success: boolean; message: string; provider: PaymentProvider }> {
    return this.wallet.registerCodPayment(orderId, buyerId);
  }

  async settleOrderPayment(webhookData: WebhookData): Promise<PayosSettlement | null> {
    return this.payos.settleOrderPayment(webhookData);
  }

  async checkPayosPaymentStatus(orderId: string, userId: string) {
    return this.payos.checkPayosPaymentStatus(orderId, userId);
  }
}
