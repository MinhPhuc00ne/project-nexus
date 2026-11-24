import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Role } from '@nexus/types';
import ProtectedRoute from './ProtectedRoute';
import ScrollToTop from '../components/common/ScrollToTop';
import ChatWidget from '../components/chat/ChatWidget';
import NonAdminLayout from '../layouts/NonAdminLayout';
import AuthLayout from '../layouts/AuthLayout';
import GuestLayout from '../layouts/GuestLayout';
import SellerSession from '../components/seller/SellerSession';
import AuctionLifecycleNotifier from '../components/auction/AuctionLifecycleNotifier';
import RouteErrorBoundary from './RouteErrorBoundary';
import { ROUTES } from './paths';
export { ROUTES } from './paths';

const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
const BuyerLayout = lazy(() => import('../layouts/BuyerLayout'));
const SellerLayout = lazy(() => import('../layouts/SellerLayout'));
const StaffLayout = lazy(() => import('../layouts/StaffLayout'));
const SellerDashboardPage = lazy(() => import('../pages/seller/SellerDashboardPage'));
const SellerOrdersPage = lazy(() => import('../pages/seller/SellerOrdersPage'));
const SellerOrderDetailPage = lazy(() => import('../pages/seller/SellerOrderDetailPage'));
const SellerShippingPage = lazy(() => import('../pages/seller/SellerShippingPage'));
const SellerAuctionsPage = lazy(() => import('../pages/seller/SellerAuctionsPage'));
const SellerAuctionDetailPage = lazy(() => import('../pages/seller/SellerAuctionDetailPage'));
const SellerProductsPage = lazy(() => import('../pages/seller/SellerProductsPage'));
const SellerFinancePage = lazy(() => import('../pages/seller/SellerFinancePage'));
const SellerDisputesPage = lazy(() => import('../pages/seller/SellerDisputesPage'));
const SellerSettingsPage = lazy(() => import('../pages/seller/SellerSettingsPage'));
const SellerAuctionConsignmentPage = lazy(
  () => import('../pages/seller/SellerAuctionConsignmentPage'),
);
const SellerReviewsPage = lazy(() => import('../pages/seller/SellerReviewsPage'));
const SellerCreateProductPage = lazy(() => import('../pages/seller/SellerCreateProductPage'));
const StaffActivationPage = lazy(() => import('../pages/staff/StaffActivationPage'));
const Login = lazy(() => import('../pages/auth/Login'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'));
const VerifyOtpPage = lazy(() => import('../pages/auth/VerifyOtpPage'));
const HomePage = lazy(() => import('../pages/guest/HomePage'));
const SearchPage = lazy(() => import('../pages/guest/SearchPage'));
const AuctionPage = lazy(() => import('../pages/guest/AuctionPage'));
const AuctionDetailPage = lazy(() => import('../pages/guest/AuctionDetailPage'));
const ProductDetailPage = lazy(() => import('../pages/guest/ProductDetailPage'));
const ShopDetailPage = lazy(() => import('../pages/guest/ShopDetailPage'));
const CategoryPage = lazy(() => import('../pages/guest/CategoryPage'));
const AboutPage = lazy(() => import('../pages/guest/AboutPage'));
const ContactPage = lazy(() => import('../pages/guest/ContactPage'));
const TermsPage = lazy(() => import('../pages/guest/TermsPage'));
const PrivacyPage = lazy(() => import('../pages/guest/PrivacyPage'));
const NotFoundPage = lazy(() => import('../pages/guest/NotFoundPage'));
const CartPage = lazy(() => import('../pages/buyer/CartPage'));
const CheckoutPage = lazy(() => import('../pages/buyer/CheckoutPage'));
const PaymentSuccessPage = lazy(() => import('../pages/buyer/PaymentSuccessPage'));
const BuyerDashboardPage = lazy(() => import('../pages/buyer/BuyerDashboardPage'));
const BuyerOrdersPage = lazy(() => import('../pages/buyer/BuyerOrdersPage'));
const BuyerOrderDetailPage = lazy(() => import('../pages/buyer/BuyerOrderDetailPage'));
const BuyerProfilePage = lazy(() => import('../pages/buyer/BuyerProfilePage'));
const BuyerWishlistPage = lazy(() => import('../pages/buyer/BuyerWishlistPage'));
const BuyerWalletPage = lazy(() => import('../pages/buyer/BuyerWalletPage'));
const BuyerBidsPage = lazy(() => import('../pages/buyer/BuyerBidsPage'));
const BuyerDisputesPage = lazy(() => import('../pages/buyer/BuyerDisputesPage'));
const BuyerAddressesPage = lazy(() => import('../pages/buyer/BuyerAddressesPage'));
const BuyerReputationPage = lazy(() => import('../pages/buyer/BuyerReputationPage'));
const BuyerNotificationsPage = lazy(() => import('../pages/buyer/BuyerNotificationsPage'));
const StaffSellerApprovalPage = lazy(() => import('../pages/staff/StaffSellerApprovalPage'));
const StaffManagementPage = lazy(() => import('../pages/staff/StaffManagementPage'));
const StaffInboxPage = lazy(() => import('../pages/staff/StaffInboxPage'));
const StaffDisputesPage = lazy(() => import('../pages/staff/StaffDisputesPage'));
const StaffOrdersPage = lazy(() => import('../pages/staff/StaffOrdersPage'));
const StaffBannersPage = lazy(() => import('../pages/staff/StaffBannersPage'));
const StaffReviewsPage = lazy(() => import('../pages/staff/StaffReviewsPage'));
const StaffAuctionSupportPage = lazy(() => import('../pages/staff/StaffAuctionSupportPage'));
const StaffFaqPage = lazy(() => import('../pages/staff/StaffFaqPage'));
const StaffHistoryPage = lazy(() => import('../pages/staff/StaffHistoryPage'));
const StaffPerformancePage = lazy(() => import('../pages/staff/StaffPerformancePage'));
const AdminProductsPage = lazy(() => import('../pages/admin/AdminProductsPage'));
const AdminOrdersPage = lazy(() => import('../pages/admin/AdminOrdersPage'));
const AdminStoresPage = lazy(() => import('../pages/admin/AdminStoresPage'));
const AdminReportsPage = lazy(() => import('../pages/admin/AdminReportsPage'));
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'));
const AdminSellersPage = lazy(() => import('../pages/admin/AdminSellersPage'));
const AdminAuctionsPage = lazy(() => import('../pages/admin/AdminAuctionsPage'));
const AdminAuctionLotsPage = lazy(() => import('../pages/admin/AdminAuctionLotsPage'));
const AdminRefundsPage = lazy(() => import('../pages/admin/AdminRefundsPage'));
const AdminFinancePage = lazy(() => import('../pages/admin/AdminFinancePage'));
const AdminSystemPage = lazy(() => import('../pages/admin/AdminSystemPage'));
const AdminSettingsPage = lazy(() => import('../pages/admin/AdminSettingsPage'));
const AdminChatPage = lazy(() => import('../pages/admin/AdminChatPage'));
const AdminCategoriesPage = lazy(() => import('../pages/admin/AdminCategoriesPage'));
const AdminBannersPage = lazy(() => import('../pages/admin/AdminBannersPage'));

function AppRouter() {
  const { t } = useTranslation('common');
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuctionLifecycleNotifier />
      <RouteErrorBoundary>
        <Suspense
          fallback={
            <main
              role="status"
              className="flex min-h-dvh items-center justify-center bg-slate-50 p-6 text-sm text-slate-600"
            >
              {t('states.loadingPage')}
            </main>
          }
        >
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
                <Route path={ROUTES.SHOP_DETAIL} element={<ShopDetailPage />} />
                <Route path={ROUTES.ABOUT} element={<AboutPage />} />
                <Route path={ROUTES.CONTACT} element={<ContactPage />} />
                <Route path={ROUTES.TERMS} element={<TermsPage />} />
                <Route path={ROUTES.PRIVACY} element={<PrivacyPage />} />

                {/* Cart */}
                <Route path={ROUTES.CART} element={<CartPage />} />

                {/* Buyer routes requiring authentication */}
                <Route element={<ProtectedRoute />}>
                  <Route path={ROUTES.CHECKOUT} element={<CheckoutPage />} />
                  <Route path={ROUTES.PAYMENT_SUCCESS} element={<PaymentSuccessPage />} />
                  <Route element={<BuyerLayout />}>
                    <Route path={ROUTES.BUYER} element={<BuyerDashboardPage />} />
                    <Route path={ROUTES.BUYER_ORDERS} element={<BuyerOrdersPage />} />
                    <Route path={ROUTES.BUYER_ORDER_DETAIL} element={<BuyerOrderDetailPage />} />
                    <Route path={ROUTES.BUYER_PROFILE} element={<BuyerProfilePage />} />
                    <Route path={ROUTES.BUYER_WISHLIST} element={<BuyerWishlistPage />} />
                    <Route path={ROUTES.BUYER_WALLET} element={<BuyerWalletPage />} />
                    <Route path={ROUTES.BUYER_BIDS} element={<BuyerBidsPage />} />
                    <Route path={ROUTES.BUYER_DISPUTES} element={<BuyerDisputesPage />} />
                    <Route path={ROUTES.BUYER_ADDRESSES} element={<BuyerAddressesPage />} />
                    <Route path={ROUTES.BUYER_REPUTATION} element={<BuyerReputationPage />} />
                    <Route path={ROUTES.BUYER_NOTIFICATIONS} element={<BuyerNotificationsPage />} />
                  </Route>
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
                  <Route path="shipping" element={<SellerShippingPage />} />
                  <Route path="auctions" element={<SellerAuctionsPage />} />
                  <Route path="auctions/:id" element={<SellerAuctionDetailPage />} />
                  <Route path="auctions/new" element={<SellerAuctionConsignmentPage />} />
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
              <Route element={<ProtectedRoute allowedRoles={[Role.SUPPORT_STAFF, Role.ADMIN]} />}>
                <Route element={<StaffLayout />}>
                  <Route
                    path={ROUTES.STAFF}
                    element={<Navigate to={ROUTES.STAFF_INBOX} replace />}
                  />
                  <Route
                    path={ROUTES.STAFF_SELLER_APPROVALS}
                    element={<StaffSellerApprovalPage />}
                  />
                  <Route path={ROUTES.STAFF_TEAM} element={<StaffManagementPage />} />
                  <Route path={ROUTES.STAFF_INBOX} element={<StaffInboxPage />} />
                  <Route path={ROUTES.STAFF_DISPUTES} element={<StaffDisputesPage />} />
                  <Route path={ROUTES.STAFF_ORDERS} element={<StaffOrdersPage />} />
                  <Route
                    path={ROUTES.STAFF_AUCTION_SUPPORT}
                    element={<StaffAuctionSupportPage />}
                  />
                  <Route path={ROUTES.STAFF_FAQ} element={<StaffFaqPage />} />
                  <Route path={ROUTES.STAFF_BANNERS} element={<StaffBannersPage />} />
                  <Route path={ROUTES.STAFF_REVIEWS} element={<StaffReviewsPage />} />
                  <Route path={ROUTES.STAFF_HISTORY} element={<StaffHistoryPage />} />
                  <Route path={ROUTES.STAFF_PERFORMANCE} element={<StaffPerformancePage />} />
                </Route>
              </Route>

              {/* Non-admin fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
            {/* Route cha giữ khung chung; mỗi route con mở một page cụ thể trong Outlet. */}
            <Route element={<ProtectedRoute allowedRoles={[Role.ADMIN]} />}>
              <Route path={ROUTES.ADMIN} element={<AdminLayout />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="categories" element={<AdminCategoriesPage />} />
                <Route path="banners" element={<AdminBannersPage />} />
                <Route path="overview" element={<AdminDashboardPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="sellers" element={<AdminSellersPage />} />
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="stores" element={<AdminStoresPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="auctions" element={<AdminAuctionsPage />} />
                <Route path="auctions/:auctionId/lots" element={<AdminAuctionLotsPage />} />
                <Route path="refunds" element={<AdminRefundsPage />} />
                <Route path="finance" element={<AdminFinancePage />} />
                <Route path="system" element={<AdminSystemPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="chat" element={<AdminChatPage />} />
                <Route path="*" element={<Navigate to="/admin/overview" replace />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </RouteErrorBoundary>
      <ChatWidget />
    </BrowserRouter>
  );
}

export default AppRouter;
