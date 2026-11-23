import { DocumentBuilder, type OpenAPIObject } from '@nestjs/swagger';

/**
 * Builds the shared OpenAPI configuration used by both the live server and static export script.
 *
 * @returns Configured OpenAPI document builder object
 */
export function buildSwaggerConfig(): Omit<OpenAPIObject, 'paths'> {
  return new DocumentBuilder()
    .setTitle('Project Nexus Backend API')
    .setDescription(
      'RESTful API specifications for Project Nexus: Authentication, RBAC, Profiles, Catalog, Commerce, Fulfillment, and Real-Time Auctions',
    )
    .setVersion('1.0.0')
    .addTag(
      '1. AUTH',
      'Authentication & Authorization: Registration, login, OTP, password recovery, and Google OAuth',
    )
    .addTag(
      '2. BUYER',
      'Buyer Portal: Personal profile, wallet balance, seller upgrade application, and mode switching',
    )
    .addTag(
      '3. SELLER',
      'Seller Portal: Merchant profile management and seller operational mode switching',
    )
    .addTag(
      '4. STAFF',
      'Staff Portal: Account activation, credential lifecycle, and staff profiles',
    )
    .addTag(
      '5. ADMIN',
      'Admin Backoffice: Staff provisioning, seller KYC reviews, user moderation, product curation, shop audits, platform settings, and administrative wallet',
    )
    .addTag(
      '6. MEDIA',
      'Media Assets: Image and document uploads stored via local server or Cloudinary',
    )
    .addTag(
      '7. CATALOG',
      'Product Catalog: Categories, product listings, inventory management, and search',
    )
    .addTag(
      '8. COMMERCE - CART',
      'Shopping Cart: Buyer cart lifecycle, price revalidation, and guest cart merging',
    )
    .addTag(
      '8. COMMERCE - ORDERS & PAYMENTS',
      'Orders & Payments: Checkout with PayOS VietQR or NEXUS Pay wallet, order lifecycle tracking, and escrow holding',
    )
    .addTag(
      '8. COMMERCE - SELLER FINANCE',
      'Seller Finance: Balance tracking, net revenue, payout withdrawal requests, and financial ledger',
    )
    .addTag(
      '8. COMMERCE - SELLER ORDERS',
      'Seller Fulfillment: Order queue management, details, fulfillment status, and GHN logistics handover',
    )
    .addTag(
      '9. NOTIFICATIONS',
      'Notifications: Real-time WebSocket delivery, REST listing, preferences, and read tracking',
    )
    .addTag(
      '10. FULFILLMENT & SHIPPING',
      'Logistics & Shipping: GHN carrier integration, parcel shipping quote calculation, and route distance tracking',
    )
    .addTag(
      '11. AUCTIONS',
      'Real-Time Auctions & Bidding: Admin auction sessions, seller consignment, and reputation-based eligibility checks',
    )
    .addBearerAuth()
    .build();
}
