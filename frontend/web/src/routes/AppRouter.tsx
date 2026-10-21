import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Role } from '@nexus/types';
import ProtectedRoute from './ProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';
import NonAdminLayout from '../layouts/NonAdminLayout';
import AuthLayout from '../layouts/AuthLayout';
import GuestLayout from '../layouts/GuestLayout';
import SellerLayout from '../layouts/SellerLayout';
import SellerSession from '../components/seller/SellerSession';
import SellerDashboardPage from '../pages/seller/SellerDashboardPage';
import SellerOrdersPage from '../pages/seller/SellerOrdersPage';
import SellerOrderDetailPage from '../pages/seller/SellerOrderDetailPage';
import SellerAuctionsPage from '../pages/seller/SellerAuctionsPage';
import SellerProductsPage from '../pages/seller/SellerProductsPage';
import SellerFinancePage from '../pages/seller/SellerFinancePage';
import SellerDisputesPage from '../pages/seller/SellerDisputesPage';
import SellerSettingsPage from '../pages/seller/SellerSettingsPage';
import SellerDraftPage from '../pages/seller/SellerDraftPage';
import SellerReviewsPage from '../pages/seller/SellerReviewsPage';
import SellerCreateProductPage from '../pages/seller/SellerCreateProductPage';
import StaffActivationPage from '../pages/staff/StaffActivationPage';
import {
  // Auth
  Login,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyOtpPage,
  // Guest
  HomePage,
  SearchPage,
  AuctionPage,
  AuctionDetailPage,
  ProductDetailPage,
  CategoryPage,
  AboutPage,
  ContactPage,
  TermsPage,
  PrivacyPage,
  NotFoundPage,
  // Buyer
  CartPage,
  CheckoutPage,
  BuyerDashboardPage,
  BuyerOrdersPage,
  BuyerOrderDetailPage,
  BuyerProfilePage,
  BuyerWishlistPage,
  BuyerWalletPage,
  BuyerBidsPage,
  BuyerDisputesPage,
  BuyerAddressesPage,
  // Staff
  StaffSellerApprovalPage,
  StaffManagementPage,
  StaffInboxPage,
  StaffDisputesPage,
  StaffAuctionSupportPage,
  StaffFaqPage,
  StaffHistoryPage,
  StaffPerformancePage,
  // Admin
  AdminDashboardPage,
  AdminUsersPage,
  AdminSellersPage,
  AdminAuctionsPage,
  AdminRefundsPage,
  AdminStudioPage,
  AdminFinancePage,
  AdminSystemPage,
  AdminSettingsPage,
  AdminCategoriesPage,
} from '../pages';

export const ROUTES = {
  // Guest
  HOME: '/',
  SEARCH: '/search',
  CATEGORY: '/categories',
  AUCTION: '/auction',
  AUCTION_DETAIL: '/auction/:id',
  PRODUCT: '/product/:id',
  ABOUT: '/about',
  CONTACT: '/contact',
  TERMS: '/terms',
  PRIVACY: '/privacy',

  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_OTP: '/verify-otp',

  // Buyer
  CART: '/cart',
  CHECKOUT: '/checkout',
  BUYER: '/buyer',
  BUYER_ORDERS: '/buyer/orders',
  BUYER_ORDER_DETAIL: '/buyer/orders/:id',
  BUYER_PROFILE: '/buyer/profile',
  BUYER_WISHLIST: '/buyer/wishlist',
  BUYER_WALLET: '/buyer/wallet',
  BUYER_BIDS: '/buyer/bids',
  BUYER_DISPUTES: '/buyer/disputes',
  BUYER_ADDRESSES: '/buyer/addresses',

  // Seller
  SELLER: '/seller',
  SELLER_PRODUCTS: '/seller/products',
  SELLER_ORDERS: '/seller/orders',
  SELLER_ORDER_DETAIL: '/seller/orders/:id',
  SELLER_AUCTIONS: '/seller/auctions',
  SELLER_FINANCE: '/seller/finance',
  SELLER_DISPUTES: '/seller/disputes',
  SELLER_SETTINGS: '/seller/settings',

  // Staff
  STAFF: '/staff',
  STAFF_SELLER_APPROVALS: '/staff/seller-approvals',
  STAFF_TEAM: '/staff/team',
  STAFF_INBOX: '/staff/inbox',
  STAFF_DISPUTES: '/staff/disputes',
  STAFF_AUCTION_SUPPORT: '/staff/auction-support',
  STAFF_FAQ: '/staff/faq',
  STAFF_HISTORY: '/staff/history',
  STAFF_PERFORMANCE: '/staff/performance',

  // Admin
  ADMIN: '/admin',
  ADMIN_CATEGORIES: '/admin/categories',
  ADMIN_OVERVIEW: '/admin/overview',
  ADMIN_USERS: '/admin/users',
  ADMIN_SELLERS: '/admin/sellers',
  ADMIN_AUCTIONS: '/admin/auctions',
  ADMIN_REFUNDS: '/admin/refunds',
  ADMIN_STUDIO: '/admin/studio',
  ADMIN_FINANCE: '/admin/finance',
  ADMIN_SYSTEM: '/admin/system',
  ADMIN_SETTINGS: '/admin/settings',
} as const;

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<NonAdminLayout />}>
          {/* Guest & Buyer routes with header & footer layout */}
          <Route element={<GuestLayout />}>
            {/* Guest */}
            <Route index element={<HomePage />} />
            <Route path={ROUTES.SEARCH} element={<SearchPage />} />
            <Route path={ROUTES.CATEGORY} element={<CategoryPage />} />
            <Route path={ROUTES.AUCTION} element={<AuctionPage />} />
            <Route path={ROUTES.AUCTION_DETAIL} element={<AuctionDetailPage />} />
            <Route path={ROUTES.PRODUCT} element={<ProductDetailPage />} />
            <Route path={ROUTES.ABOUT} element={<AboutPage />} />
            <Route path={ROUTES.CONTACT} element={<ContactPage />} />
            <Route path={ROUTES.TERMS} element={<TermsPage />} />
            <Route path={ROUTES.PRIVACY} element={<PrivacyPage />} />

            {/* Cart */}
            <Route path={ROUTES.CART} element={<CartPage />} />

            {/* Buyer routes requiring authentication */}
            <Route element={<ProtectedRoute />}>
              <Route path={ROUTES.CHECKOUT} element={<CheckoutPage />} />
              <Route path={ROUTES.BUYER} element={<BuyerDashboardPage />} />
              <Route path={ROUTES.BUYER_ORDERS} element={<BuyerOrdersPage />} />
              <Route path={ROUTES.BUYER_ORDER_DETAIL} element={<BuyerOrderDetailPage />} />
              <Route path={ROUTES.BUYER_PROFILE} element={<BuyerProfilePage />} />
              <Route path={ROUTES.BUYER_WISHLIST} element={<BuyerWishlistPage />} />
              <Route path={ROUTES.BUYER_WALLET} element={<BuyerWalletPage />} />
              <Route path={ROUTES.BUYER_BIDS} element={<BuyerBidsPage />} />
              <Route path={ROUTES.BUYER_DISPUTES} element={<BuyerDisputesPage />} />
              <Route path={ROUTES.BUYER_ADDRESSES} element={<BuyerAddressesPage />} />
            </Route>
          </Route>

          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
            <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
            <Route path={ROUTES.VERIFY_OTP} element={<VerifyOtpPage />} />
          </Route>

          {/* Seller routes */}
          <Route element={<ProtectedRoute allowedRoles={[Role.SELLER]} />}>
            <Route
              path={ROUTES.SELLER}
              element={
                <SellerSession>
                  <SellerLayout />
                </SellerSession>
              }
            >
              <Route index element={<SellerDashboardPage home />} />
              <Route path="overview" element={<SellerDashboardPage />} />
              <Route path="products" element={<SellerProductsPage />} />
              <Route path="products/new" element={<SellerCreateProductPage />} />
              <Route path="products/:id/edit" element={<SellerCreateProductPage />} />
              <Route path="orders" element={<SellerOrdersPage />} />
              <Route path="orders/:id" element={<SellerOrderDetailPage />} />
              <Route path="auctions" element={<SellerAuctionsPage />} />
              <Route path="auctions/new" element={<SellerDraftPage auction />} />
              <Route path="finance" element={<SellerFinancePage />} />
              <Route path="inventory" element={<SellerProductsPage inventory />} />
              <Route path="reviews" element={<SellerReviewsPage />} />
              <Route path="disputes" element={<SellerDisputesPage />} />
              <Route path="settings" element={<SellerSettingsPage />} />
              <Route path="profile" element={<BuyerProfilePage />} />
            </Route>
          </Route>

          {/* Staff routes */}
          <Route path="/staff/activate" element={<StaffActivationPage />} />
          <Route element={<ProtectedRoute allowedRoles={[Role.SUPPORT_STAFF]} />}>
            <Route path={ROUTES.STAFF} element={<Navigate to={ROUTES.STAFF_INBOX} replace />} />
            <Route path={ROUTES.STAFF_SELLER_APPROVALS} element={<StaffSellerApprovalPage />} />
            <Route path={ROUTES.STAFF_TEAM} element={<StaffManagementPage />} />
            <Route path={ROUTES.STAFF_INBOX} element={<StaffInboxPage />} />
            <Route path={ROUTES.STAFF_DISPUTES} element={<StaffDisputesPage />} />
            <Route path={ROUTES.STAFF_AUCTION_SUPPORT} element={<StaffAuctionSupportPage />} />
            <Route path={ROUTES.STAFF_FAQ} element={<StaffFaqPage />} />
            <Route path={ROUTES.STAFF_HISTORY} element={<StaffHistoryPage />} />
            <Route path={ROUTES.STAFF_PERFORMANCE} element={<StaffPerformancePage />} />
          </Route>

          {/* Non-admin fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        {/* Route cha giữ khung chung; mỗi route con mở một page cụ thể trong Outlet. */}
        <Route element={<ProtectedRoute allowedRoles={[Role.ADMIN]} />}>
          <Route path={ROUTES.ADMIN} element={<AdminLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="overview" element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="sellers" element={<AdminSellersPage />} />
            <Route path="auctions" element={<AdminAuctionsPage />} />
            <Route path="refunds" element={<AdminRefundsPage />} />
            <Route path="studio" element={<AdminStudioPage />} />
            <Route path="finance" element={<AdminFinancePage />} />
            <Route path="system" element={<AdminSystemPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="*" element={<Navigate to="/admin/overview" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
