-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPPORT_STAFF', 'SELLER', 'BUYER', 'GUEST');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PREPARING', 'SHIPPING', 'DELIVERED', 'CONFIRMED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'EXTENDED', 'ENDED', 'SETTLED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuctionItemStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AuctionAwardTier" AS ENUM ('PRIMARY_WINNER', 'SECOND_CHANCE');

-- CreateEnum
CREATE TYPE "AuctionAwardStatus" AS ENUM ('AWAITING_ACCEPTANCE', 'AWAITING_DEPOSIT', 'AWAITING_CHECKOUT', 'PAID', 'PAYMENT_DEFAULT', 'DECLINED', 'BUYER_WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AuctionComplaintStatus" AS ENUM ('OPEN', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'DISBURSED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_SELLER_FAVOR', 'RESOLVED_BUYER_FAVOR', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYOS', 'WALLET', 'COD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CarrierName" AS ENUM ('GHN');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('CREATED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ReputationTrustLevel" AS ENUM ('EXCELLENT', 'GOOD', 'STANDARD', 'PROBATION', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PenaltyType" AS ENUM ('PAYMENT_TIMEOUT', 'ORDER_CANCELLATION', 'AUCTION_DEFAULT', 'MISREPRESENTATION', 'FRAUD');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER', 'AUCTION', 'SYSTEM', 'PAYMENT', 'DISPUTE');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'ESCROW_LOCK', 'ESCROW_PAYOUT', 'ESCROW_REFUND', 'ORDER_PAYMENT', 'PLATFORM_FEE', 'AUCTION_BID_LOCK', 'AUCTION_BID_REFUND', 'AUCTION_DEPOSIT_FORFEIT', 'AUCTION_DEPOSIT_COMPENSATION');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('USER_WALLET', 'ESCROW_LIABILITY', 'PLATFORM_REVENUE');

-- CreateEnum
CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'COMMITTED', 'RELEASED');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('ACCEPTED', 'SUPERSEDED', 'WINNING', 'REJECTED');

-- CreateEnum
CREATE TYPE "SellerRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ShopActionType" AS ENUM ('WARN', 'SUSPEND', 'RESTORE');

-- CreateEnum
CREATE TYPE "ReviewMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "ViolationStatus" AS ENUM ('PENDING', 'INVESTIGATING', 'CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "GhnEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "GhnAccountStatus" AS ENUM ('PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "AfterSalesKind" AS ENUM ('CANCEL', 'RETURN');

-- CreateEnum
CREATE TYPE "AfterSalesStatus" AS ENUM ('REQUESTED', 'APPROVING', 'APPROVED', 'RECEIVED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RefundDestination" AS ENUM ('WALLET', 'ORIGINAL');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCESS');

-- CreateEnum
CREATE TYPE "OrderCancellationActor" AS ENUM ('BUYER', 'SELLER', 'SYSTEM', 'ADMIN');

-- CreateEnum
CREATE TYPE "BannerDisableSource" AS ENUM ('UPDATE', 'DELETE', 'DISABLE');

-- CreateEnum
CREATE TYPE "ShopViolationPenaltyLevel" AS ENUM ('WARNING', 'PENALTY_POINTS', 'TEMPORARY_SUSPENSION', 'PERMANENT_BAN', 'MISREPRESENTATION', 'FRAUD');

-- CreateEnum
CREATE TYPE "ChatConversationType" AS ENUM ('BUYER_SELLER', 'STAFF_SELLER', 'STAFF_BUYER');

-- CreateEnum
CREATE TYPE "ChatConversationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChatContextType" AS ENUM ('GENERAL', 'ORDER', 'PRODUCT', 'AUCTION', 'DISPUTE', 'TICKET');

-- CreateEnum
CREATE TYPE "ChatAutoReplyScope" AS ENUM ('SHOP', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ChatAutoReplyTriggerType" AS ENUM ('WELCOME', 'OFFLINE', 'KEYWORD', 'DEFAULT');

-- CreateEnum
CREATE TYPE "ChatAutoReplyStatus" AS ENUM ('ACTIVE', 'CANCELLED_BY_ADMIN');

-- CreateEnum
CREATE TYPE "BannerCreatorRole" AS ENUM ('ADMIN', 'STAFF');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone_number" TEXT,
    "avatar_url" TEXT,
    "shop_avatar_url" TEXT,
    "role" "Role" NOT NULL DEFAULT 'BUYER',
    "is_seller_active" BOOLEAN NOT NULL DEFAULT false,
    "is_shop_suspended" BOOLEAN NOT NULL DEFAULT false,
    "suspension_reason" TEXT,
    "reputation_score" INTEGER NOT NULL DEFAULT 50,
    "trust_level" "ReputationTrustLevel" NOT NULL DEFAULT 'PROBATION',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_code" TEXT,
    "code_expires_at" TIMESTAMP(3),
    "personal_email" VARCHAR(255),
    "platform_email" VARCHAR(255),
    "bank_name" VARCHAR(120),
    "account_number" VARCHAR(50),
    "account_holder_name" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "ward" TEXT,
    "district" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'VN',
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "formatted_address" TEXT,
    "place_id" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" "WalletType" NOT NULL DEFAULT 'USER_WALLET',
    "balance" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "locked_balance" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "amount" DECIMAL(15,0) NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'SUCCESS',
    "reference_id" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "delta_points" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "penalty_type" "PenaltyType",
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parent_id" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "base_price" DECIMAL(15,0) NOT NULL,
    "weight_grams" INTEGER NOT NULL DEFAULT 500,
    "length_cm" INTEGER NOT NULL DEFAULT 10,
    "width_cm" INTEGER NOT NULL DEFAULT 10,
    "height_cm" INTEGER NOT NULL DEFAULT 10,
    "three_model_key" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "hidden_by_shop_suspension" BOOLEAN NOT NULL DEFAULT false,
    "trending_excluded" BOOLEAN NOT NULL DEFAULT false,
    "trending_excluded_at" TIMESTAMP(3),
    "trending_notified_at" TIMESTAMP(3),
    "trending_top_one_notified_at" TIMESTAMP(3),
    "sale_price" DECIMAL(15,0),
    "sale_starts_at" TIMESTAMP(3),
    "sale_ends_at" TIMESTAMP(3),
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "rating_sum" INTEGER NOT NULL DEFAULT 0,
    "average_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "is_thumbnail" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_options" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "values" TEXT[],

    CONSTRAINT "product_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT 'WH_001',
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_ghn_accounts" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "environment" "GhnEnvironment" NOT NULL,
    "profile_fingerprint" TEXT,
    "district_id" INTEGER NOT NULL,
    "ward_code" TEXT NOT NULL,
    "status" "GhnAccountStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "ghn_shop_id" INTEGER,
    "ghn_client_id" INTEGER,
    "carrier_name" TEXT,
    "carrier_phone" TEXT,
    "carrier_address" TEXT,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_ghn_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventories" (
    "id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "total_qty" INTEGER NOT NULL DEFAULT 0,
    "available_qty" INTEGER NOT NULL DEFAULT 0,
    "reserved_qty" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reservations" (
    "id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference_id" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_ledgers" (
    "id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "change_qty" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "option_key" TEXT NOT NULL DEFAULT '',
    "selections" JSONB,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price_at_added" DECIMAL(15,0) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "subtotal" DECIMAL(15,0) NOT NULL,
    "shipping_fee" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,0) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "is_auction" BOOLEAN NOT NULL DEFAULT false,
    "cancellation_actor" "OrderCancellationActor",
    "shipping_address_snapshot" JSONB NOT NULL,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT,
    "auction_item_id" TEXT,
    "title_snapshot" TEXT,
    "selections" JSONB,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,0) NOT NULL,
    "total_price" DECIMAL(15,0) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "amount" DECIMAL(15,0) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_code" TEXT,
    "idempotency_key" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "after_sales_requests" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "kind" "AfterSalesKind" NOT NULL,
    "status" "AfterSalesStatus" NOT NULL DEFAULT 'REQUESTED',
    "requested_by" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence_urls" JSONB,
    "refund_to_wallet" BOOLEAN NOT NULL DEFAULT false,
    "decision_reason" TEXT,
    "reviewed_by" TEXT,
    "return_waybill_code" TEXT,
    "received_at" TIMESTAMP(3),
    "restocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "after_sales_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_refunds" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "amount" DECIMAL(15,0) NOT NULL,
    "destination" "RefundDestination" NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "admin_wallet_id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "external_reference" TEXT,
    "completed_by" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" TEXT NOT NULL,
    "product_id" TEXT,
    "seller_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "starting_price" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "reserve_price" DECIMAL(15,0),
    "current_highest_bid" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "current_highest_bidder_id" TEXT,
    "bid_increment" DECIMAL(15,0) NOT NULL DEFAULT 100000,
    "status" "AuctionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "original_end_time" TIMESTAMP(3) NOT NULL,
    "is_extended" BOOLEAN NOT NULL DEFAULT false,
    "total_bids_count" INTEGER NOT NULL DEFAULT 0,
    "min_buyer_reputation" INTEGER NOT NULL DEFAULT 40,
    "min_seller_reputation" INTEGER NOT NULL DEFAULT 50,
    "created_by_admin_id" TEXT,
    "consignment_deadline" TIMESTAMP(3),
    "is_consignment_locked" BOOLEAN NOT NULL DEFAULT false,
    "consignment_locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_items" (
    "id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "images" TEXT[],
    "three_model_key" TEXT,
    "proposed_starting_price" DECIMAL(15,0) NOT NULL,
    "proposed_reserve_price" DECIMAL(15,0),
    "proposed_bid_increment" DECIMAL(15,0) NOT NULL DEFAULT 100000,
    "weight_grams" INTEGER NOT NULL DEFAULT 500,
    "length_cm" INTEGER NOT NULL DEFAULT 20,
    "width_cm" INTEGER NOT NULL DEFAULT 15,
    "height_cm" INTEGER NOT NULL DEFAULT 10,
    "appraisal_certificate_number" TEXT,
    "appraisal_agency" TEXT,
    "certificate_images" TEXT[],
    "certificate_issue_date" TIMESTAMP(3),
    "status" "AuctionItemStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "lot_status" "AuctionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "is_seller_flagged" BOOLEAN NOT NULL DEFAULT false,
    "flag_reason" TEXT,
    "rejection_reason" TEXT,
    "staff_note" TEXT,
    "lot_number" INTEGER,
    "starting_price" DECIMAL(15,0),
    "reserve_price" DECIMAL(15,0),
    "bid_increment" DECIMAL(15,0),
    "current_highest_bid" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "current_highest_bidder_id" TEXT,
    "total_bids_count" INTEGER NOT NULL DEFAULT 0,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "original_end_time" TIMESTAMP(3),
    "is_extended" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by_admin_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "auction_item_id" TEXT,
    "bidder_id" TEXT NOT NULL,
    "bid_amount" DECIMAL(15,0) NOT NULL,
    "status" "BidStatus" NOT NULL DEFAULT 'ACCEPTED',
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_awards" (
    "id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "auction_item_id" TEXT,
    "bid_id" TEXT NOT NULL,
    "buyer_id" TEXT,
    "order_id" TEXT,
    "tier" "AuctionAwardTier" NOT NULL DEFAULT 'PRIMARY_WINNER',
    "offer_amount" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "deposit_amount" DECIMAL(15,0) NOT NULL,
    "status" "AuctionAwardStatus" NOT NULL DEFAULT 'AWAITING_CHECKOUT',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "resolution_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_complaints" (
    "id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "auction_item_id" TEXT,
    "reporter_id" TEXT NOT NULL,
    "reporter_role" "Role" NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence_urls" TEXT[],
    "status" "AuctionComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "admin_note" TEXT,
    "handled_by_id" TEXT,
    "handled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow_records" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "total_amount" DECIMAL(15,0) NOT NULL,
    "platform_fee" DECIMAL(15,0) NOT NULL,
    "seller_payout" DECIMAL(15,0) NOT NULL,
    "status" "EscrowStatus" NOT NULL DEFAULT 'HELD',
    "held_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disbursed_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),

    CONSTRAINT "escrow_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "carrier" "CarrierName" NOT NULL DEFAULT 'GHN',
    "tracking_number" TEXT,
    "shipping_fee" DECIMAL(15,0) NOT NULL,
    "chargeable_weight" DECIMAL(10,2) NOT NULL,
    "is_international" BOOLEAN NOT NULL DEFAULT false,
    "customs_fee" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'CREATED',
    "waybill_code" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "opened_by_user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence_urls" JSONB,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution_notes" TEXT,
    "resolved_by_user_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "rating" DECIMAL(2,1) NOT NULL,
    "comment" TEXT,
    "media_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_shop_review" BOOLEAN NOT NULL DEFAULT true,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "hidden_reason" TEXT,
    "hidden_at" TIMESTAMP(3),
    "hidden_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "media_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seller_reply" TEXT,
    "seller_replied_at" TIMESTAMP(3),
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "hidden_reason" TEXT,
    "hidden_at" TIMESTAMP(3),
    "hidden_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_media" (
    "id" TEXT NOT NULL,
    "product_review_id" TEXT,
    "shop_review_id" TEXT,
    "media_type" "ReviewMediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_replies" (
    "id" TEXT NOT NULL,
    "product_review_id" TEXT,
    "shop_review_id" TEXT,
    "author_id" TEXT NOT NULL,
    "author_role" "Role" NOT NULL,
    "content" TEXT NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "hidden_reason" TEXT,
    "hidden_at" TIMESTAMP(3),
    "hidden_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_reply_media" (
    "id" TEXT NOT NULL,
    "reply_id" TEXT NOT NULL,
    "media_type" "ReviewMediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_reply_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_review_helpful_votes" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_review_helpful_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_reviews" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "target_url" TEXT,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "creator_id" TEXT NOT NULL,
    "creator_role" "BannerCreatorRole" NOT NULL,
    "auction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banner_disable_history" (
    "id" TEXT NOT NULL,
    "banner_id" TEXT NOT NULL,
    "banner_title" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "creator_name" TEXT NOT NULL,
    "creator_role" "BannerCreatorRole" NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "actor_role" "Role" NOT NULL,
    "source" "BannerDisableSource" NOT NULL,
    "was_active" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banner_disable_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_logs" (
    "id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "operator_id" TEXT,
    "trace_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "auction_id" TEXT,
    "target_url" TEXT,
    "metadata" JSONB,
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_upgrade_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "store_name" TEXT NOT NULL,
    "store_description" TEXT,
    "phone" TEXT NOT NULL,
    "business_email" TEXT,
    "identity_card_number" TEXT,
    "attachment_url" TEXT,
    "street" TEXT,
    "ward" TEXT,
    "district" TEXT,
    "city" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "formatted_address" TEXT,
    "place_id" TEXT,
    "status" "SellerRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "reviewed_by_admin_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_upgrade_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_invitations" (
    "id" TEXT NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "personal_email" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(50),
    "department" VARCHAR(100),
    "token" VARCHAR(255) NOT NULL,
    "otp" VARCHAR(10),
    "expires_at" TIMESTAMP(6) NOT NULL,
    "is_accepted" BOOLEAN NOT NULL DEFAULT false,
    "assigned_email" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_action_logs" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" "ShopActionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_violations" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "product_id" TEXT,
    "reporter_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_urls" JSONB,
    "penalty_level" "ShopViolationPenaltyLevel",
    "status" "ViolationStatus" NOT NULL DEFAULT 'PENDING',
    "resolution_notes" TEXT,
    "handled_by_admin_id" TEXT,
    "handled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(15,0) NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_holder_name" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "admin_note" TEXT,
    "reviewed_by_admin_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" TEXT NOT NULL,
    "type" "ChatConversationType" NOT NULL DEFAULT 'BUYER_SELLER',
    "participant1_id" TEXT NOT NULL,
    "participant2_id" TEXT,
    "assigned_staff_id" TEXT,
    "title" TEXT,
    "context_id" TEXT,
    "context_type" "ChatContextType",
    "last_message" TEXT,
    "last_message_at" TIMESTAMP(3),
    "unread_count_user1" INTEGER NOT NULL DEFAULT 0,
    "unread_count_user2" INTEGER NOT NULL DEFAULT 0,
    "status" "ChatConversationStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB DEFAULT '[]',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_auto_replies" (
    "id" TEXT NOT NULL,
    "scope" "ChatAutoReplyScope" NOT NULL DEFAULT 'SHOP',
    "shop_id" TEXT,
    "name" TEXT,
    "trigger_type" "ChatAutoReplyTriggerType" NOT NULL DEFAULT 'WELCOME',
    "keyword" TEXT,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "status" "ChatAutoReplyStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancel_reason" TEXT,
    "cancelled_by" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_auto_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_platform_email_key" ON "users"("platform_email");

-- CreateIndex
CREATE INDEX "user_addresses_user_id_is_default_idx" ON "user_addresses"("user_id", "is_default");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_is_revoked_idx" ON "refresh_tokens"("user_id", "is_revoked");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "wallets_type_idx" ON "wallets"("type");

-- CreateIndex
CREATE INDEX "wallet_transactions_wallet_id_created_at_idx" ON "wallet_transactions"("wallet_id", "created_at");

-- CreateIndex
CREATE INDEX "wallet_transactions_reference_id_idx" ON "wallet_transactions"("reference_id");

-- CreateIndex
CREATE INDEX "reputation_logs_user_id_created_at_idx" ON "reputation_logs"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "products_seller_id_status_idx" ON "products"("seller_id", "status");

-- CreateIndex
CREATE INDEX "products_category_id_status_idx" ON "products"("category_id", "status");

-- CreateIndex
CREATE INDEX "products_status_created_at_idx" ON "products"("status", "created_at");

-- CreateIndex
CREATE INDEX "product_images_product_id_sort_order_idx" ON "product_images"("product_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "product_options_product_id_name_key" ON "product_options"("product_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "seller_ghn_accounts_environment_status_idx" ON "seller_ghn_accounts"("environment", "status");

-- CreateIndex
CREATE INDEX "seller_ghn_accounts_verified_by_idx" ON "seller_ghn_accounts"("verified_by");

-- CreateIndex
CREATE UNIQUE INDEX "seller_ghn_accounts_seller_id_environment_key" ON "seller_ghn_accounts"("seller_id", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "seller_ghn_accounts_environment_ghn_shop_id_key" ON "seller_ghn_accounts"("environment", "ghn_shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventories_warehouse_id_product_id_key" ON "inventories"("warehouse_id", "product_id");

-- CreateIndex
CREATE INDEX "inventory_reservations_inventory_id_status_idx" ON "inventory_reservations"("inventory_id", "status");

-- CreateIndex
CREATE INDEX "inventory_reservations_status_expires_at_idx" ON "inventory_reservations"("status", "expires_at");

-- CreateIndex
CREATE INDEX "inventory_reservations_reference_id_idx" ON "inventory_reservations"("reference_id");

-- CreateIndex
CREATE INDEX "inventory_ledgers_inventory_id_created_at_idx" ON "inventory_ledgers"("inventory_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "carts_user_id_key" ON "carts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_product_id_option_key_key" ON "cart_items"("cart_id", "product_id", "option_key");

-- CreateIndex
CREATE INDEX "wishlist_items_user_id_created_at_idx" ON "wishlist_items"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_user_id_product_id_key" ON "wishlist_items"("user_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "orders_buyer_id_status_created_at_idx" ON "orders"("buyer_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "orders_seller_id_status_created_at_idx" ON "orders"("seller_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "order_items_auction_item_id_idx" ON "order_items"("auction_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_order_id_status_idx" ON "payments"("order_id", "status");

-- CreateIndex
CREATE INDEX "payments_transaction_code_idx" ON "payments"("transaction_code");

-- CreateIndex
CREATE UNIQUE INDEX "after_sales_requests_order_id_key" ON "after_sales_requests"("order_id");

-- CreateIndex
CREATE INDEX "after_sales_requests_status_created_at_idx" ON "after_sales_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "after_sales_requests_requested_by_idx" ON "after_sales_requests"("requested_by");

-- CreateIndex
CREATE INDEX "after_sales_requests_reviewed_by_idx" ON "after_sales_requests"("reviewed_by");

-- CreateIndex
CREATE UNIQUE INDEX "order_refunds_payment_id_key" ON "order_refunds"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_refunds_transaction_id_key" ON "order_refunds"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_refunds_external_reference_key" ON "order_refunds"("external_reference");

-- CreateIndex
CREATE INDEX "order_refunds_status_created_at_idx" ON "order_refunds"("status", "created_at");

-- CreateIndex
CREATE INDEX "order_refunds_completed_by_idx" ON "order_refunds"("completed_by");

-- CreateIndex
CREATE INDEX "auctions_status_end_time_idx" ON "auctions"("status", "end_time");

-- CreateIndex
CREATE INDEX "auctions_current_highest_bidder_id_idx" ON "auctions"("current_highest_bidder_id");

-- CreateIndex
CREATE INDEX "auction_items_auction_id_status_idx" ON "auction_items"("auction_id", "status");

-- CreateIndex
CREATE INDEX "auction_items_auction_id_lot_status_end_time_idx" ON "auction_items"("auction_id", "lot_status", "end_time");

-- CreateIndex
CREATE INDEX "auction_items_seller_id_idx" ON "auction_items"("seller_id");

-- CreateIndex
CREATE INDEX "auction_items_current_highest_bidder_id_idx" ON "auction_items"("current_highest_bidder_id");

-- CreateIndex
CREATE INDEX "bids_auction_id_placed_at_idx" ON "bids"("auction_id", "placed_at");

-- CreateIndex
CREATE INDEX "bids_auction_item_id_placed_at_idx" ON "bids"("auction_item_id", "placed_at");

-- CreateIndex
CREATE INDEX "bids_bidder_id_placed_at_idx" ON "bids"("bidder_id", "placed_at");

-- CreateIndex
CREATE UNIQUE INDEX "auction_awards_bid_id_key" ON "auction_awards"("bid_id");

-- CreateIndex
CREATE UNIQUE INDEX "auction_awards_order_id_key" ON "auction_awards"("order_id");

-- CreateIndex
CREATE INDEX "auction_awards_status_expires_at_idx" ON "auction_awards"("status", "expires_at");

-- CreateIndex
CREATE INDEX "auction_awards_auction_item_id_status_idx" ON "auction_awards"("auction_item_id", "status");

-- CreateIndex
CREATE INDEX "auction_awards_buyer_id_status_idx" ON "auction_awards"("buyer_id", "status");

-- CreateIndex
CREATE INDEX "auction_complaints_auction_id_status_idx" ON "auction_complaints"("auction_id", "status");

-- CreateIndex
CREATE INDEX "auction_complaints_reporter_id_created_at_idx" ON "auction_complaints"("reporter_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_records_order_id_key" ON "escrow_records"("order_id");

-- CreateIndex
CREATE INDEX "escrow_records_status_held_at_idx" ON "escrow_records"("status", "held_at");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "shipments_status_created_at_idx" ON "shipments"("status", "created_at");

-- CreateIndex
CREATE INDEX "shipments_waybill_code_idx" ON "shipments"("waybill_code");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_order_id_key" ON "disputes"("order_id");

-- CreateIndex
CREATE INDEX "disputes_status_created_at_idx" ON "disputes"("status", "created_at");

-- CreateIndex
CREATE INDEX "disputes_opened_by_user_id_idx" ON "disputes"("opened_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_order_id_key" ON "reviews"("order_id");

-- CreateIndex
CREATE INDEX "reviews_target_user_id_created_at_idx" ON "reviews"("target_user_id", "created_at");

-- CreateIndex
CREATE INDEX "reviews_reviewer_id_idx" ON "reviews"("reviewer_id");

-- CreateIndex
CREATE INDEX "reviews_hidden_by_id_idx" ON "reviews"("hidden_by_id");

-- CreateIndex
CREATE INDEX "product_reviews_product_id_created_at_idx" ON "product_reviews"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "product_reviews_hidden_by_id_idx" ON "product_reviews"("hidden_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_order_id_product_id_key" ON "product_reviews"("order_id", "product_id");

-- CreateIndex
CREATE INDEX "review_media_product_review_id_sort_order_idx" ON "review_media"("product_review_id", "sort_order");

-- CreateIndex
CREATE INDEX "review_media_shop_review_id_sort_order_idx" ON "review_media"("shop_review_id", "sort_order");

-- CreateIndex
CREATE INDEX "review_replies_product_review_id_created_at_idx" ON "review_replies"("product_review_id", "created_at");

-- CreateIndex
CREATE INDEX "review_replies_shop_review_id_created_at_idx" ON "review_replies"("shop_review_id", "created_at");

-- CreateIndex
CREATE INDEX "review_replies_hidden_by_id_idx" ON "review_replies"("hidden_by_id");

-- CreateIndex
CREATE INDEX "review_reply_media_reply_id_sort_order_idx" ON "review_reply_media"("reply_id", "sort_order");

-- CreateIndex
CREATE INDEX "product_review_helpful_votes_user_id_idx" ON "product_review_helpful_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_review_helpful_votes_review_id_user_id_key" ON "product_review_helpful_votes"("review_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_reviews_order_id_key" ON "customer_reviews"("order_id");

-- CreateIndex
CREATE INDEX "customer_reviews_buyer_id_created_at_idx" ON "customer_reviews"("buyer_id", "created_at");

-- CreateIndex
CREATE INDEX "event_banners_is_active_starts_at_ends_at_idx" ON "event_banners"("is_active", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "event_banners_creator_role_created_at_id_idx" ON "event_banners"("creator_role", "created_at", "id");

-- CreateIndex
CREATE INDEX "banner_disable_history_banner_id_created_at_idx" ON "banner_disable_history"("banner_id", "created_at");

-- CreateIndex
CREATE INDEX "banner_disable_history_actor_id_created_at_idx" ON "banner_disable_history"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "banner_disable_history_created_at_id_idx" ON "banner_disable_history"("created_at", "id");

-- CreateIndex
CREATE INDEX "system_settings_updated_by_id_idx" ON "system_settings"("updated_by_id");

-- CreateIndex
CREATE INDEX "outbox_events_status_available_at_idx" ON "outbox_events"("status", "available_at");

-- CreateIndex
CREATE INDEX "outbox_events_event_name_created_at_idx" ON "outbox_events"("event_name", "created_at");

-- CreateIndex
CREATE INDEX "event_logs_event_name_created_at_idx" ON "event_logs"("event_name", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_channel_key" ON "notification_preferences"("user_id", "channel");

-- CreateIndex
CREATE INDEX "seller_upgrade_requests_user_id_status_idx" ON "seller_upgrade_requests"("user_id", "status");

-- CreateIndex
CREATE INDEX "seller_upgrade_requests_status_created_at_idx" ON "seller_upgrade_requests"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "staff_invitations_token_key" ON "staff_invitations"("token");

-- CreateIndex
CREATE INDEX "shop_action_logs_shop_id_created_at_idx" ON "shop_action_logs"("shop_id", "created_at");

-- CreateIndex
CREATE INDEX "shop_violations_shop_id_status_idx" ON "shop_violations"("shop_id", "status");

-- CreateIndex
CREATE INDEX "withdrawal_requests_user_id_status_idx" ON "withdrawal_requests"("user_id", "status");

-- CreateIndex
CREATE INDEX "chat_conversations_participant1_id_participant2_id_idx" ON "chat_conversations"("participant1_id", "participant2_id");

-- CreateIndex
CREATE INDEX "chat_conversations_assigned_staff_id_idx" ON "chat_conversations"("assigned_staff_id");

-- CreateIndex
CREATE INDEX "chat_conversations_context_id_idx" ON "chat_conversations"("context_id");

-- CreateIndex
CREATE INDEX "chat_conversations_context_id_context_type_idx" ON "chat_conversations"("context_id", "context_type");

-- CreateIndex
CREATE INDEX "chat_conversations_status_idx" ON "chat_conversations"("status");

-- CreateIndex
CREATE INDEX "chat_conversations_participant2_id_idx" ON "chat_conversations"("participant2_id");

-- CreateIndex
CREATE INDEX "chat_messages_conversation_id_created_at_idx" ON "chat_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_sender_id_idx" ON "chat_messages"("sender_id");

-- CreateIndex
CREATE INDEX "chat_auto_replies_shop_id_scope_idx" ON "chat_auto_replies"("shop_id", "scope");

-- CreateIndex
CREATE INDEX "chat_auto_replies_status_idx" ON "chat_auto_replies"("status");

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_logs" ADD CONSTRAINT "reputation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_ghn_accounts" ADD CONSTRAINT "seller_ghn_accounts_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_ghn_accounts" ADD CONSTRAINT "seller_ghn_accounts_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledgers" ADD CONSTRAINT "inventory_ledgers_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_auction_item_id_fkey" FOREIGN KEY ("auction_item_id") REFERENCES "auction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "after_sales_requests" ADD CONSTRAINT "after_sales_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "after_sales_requests" ADD CONSTRAINT "after_sales_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "after_sales_requests" ADD CONSTRAINT "after_sales_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_admin_wallet_id_fkey" FOREIGN KEY ("admin_wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_current_highest_bidder_id_fkey" FOREIGN KEY ("current_highest_bidder_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_current_highest_bidder_id_fkey" FOREIGN KEY ("current_highest_bidder_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_item_id_fkey" FOREIGN KEY ("auction_item_id") REFERENCES "auction_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_bidder_id_fkey" FOREIGN KEY ("bidder_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_awards" ADD CONSTRAINT "auction_awards_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_awards" ADD CONSTRAINT "auction_awards_auction_item_id_fkey" FOREIGN KEY ("auction_item_id") REFERENCES "auction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_awards" ADD CONSTRAINT "auction_awards_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "bids"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_awards" ADD CONSTRAINT "auction_awards_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_awards" ADD CONSTRAINT "auction_awards_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_complaints" ADD CONSTRAINT "auction_complaints_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_complaints" ADD CONSTRAINT "auction_complaints_auction_item_id_fkey" FOREIGN KEY ("auction_item_id") REFERENCES "auction_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_complaints" ADD CONSTRAINT "auction_complaints_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_complaints" ADD CONSTRAINT "auction_complaints_handled_by_id_fkey" FOREIGN KEY ("handled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_records" ADD CONSTRAINT "escrow_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_user_id_fkey" FOREIGN KEY ("opened_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_hidden_by_id_fkey" FOREIGN KEY ("hidden_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_hidden_by_id_fkey" FOREIGN KEY ("hidden_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_media" ADD CONSTRAINT "review_media_product_review_id_fkey" FOREIGN KEY ("product_review_id") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_media" ADD CONSTRAINT "review_media_shop_review_id_fkey" FOREIGN KEY ("shop_review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_product_review_id_fkey" FOREIGN KEY ("product_review_id") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_shop_review_id_fkey" FOREIGN KEY ("shop_review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_hidden_by_id_fkey" FOREIGN KEY ("hidden_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_reply_media" ADD CONSTRAINT "review_reply_media_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "review_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review_helpful_votes" ADD CONSTRAINT "product_review_helpful_votes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review_helpful_votes" ADD CONSTRAINT "product_review_helpful_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_reviews" ADD CONSTRAINT "customer_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_reviews" ADD CONSTRAINT "customer_reviews_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_reviews" ADD CONSTRAINT "customer_reviews_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_banners" ADD CONSTRAINT "event_banners_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_banners" ADD CONSTRAINT "event_banners_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banner_disable_history" ADD CONSTRAINT "banner_disable_history_banner_id_fkey" FOREIGN KEY ("banner_id") REFERENCES "event_banners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banner_disable_history" ADD CONSTRAINT "banner_disable_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_upgrade_requests" ADD CONSTRAINT "seller_upgrade_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_upgrade_requests" ADD CONSTRAINT "seller_upgrade_requests_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_action_logs" ADD CONSTRAINT "shop_action_logs_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_action_logs" ADD CONSTRAINT "shop_action_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_violations" ADD CONSTRAINT "shop_violations_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_violations" ADD CONSTRAINT "shop_violations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_violations" ADD CONSTRAINT "shop_violations_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_violations" ADD CONSTRAINT "shop_violations_handled_by_admin_id_fkey" FOREIGN KEY ("handled_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_participant1_id_fkey" FOREIGN KEY ("participant1_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_participant2_id_fkey" FOREIGN KEY ("participant2_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_auto_replies" ADD CONSTRAINT "chat_auto_replies_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_auto_replies" ADD CONSTRAINT "chat_auto_replies_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

