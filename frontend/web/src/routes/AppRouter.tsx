import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from '../pages/Login/Login';
import HomePage from '../pages/home/HomePage';
import RegisterPage from '../pages/register/RegisterPage';
import StaffDashboard from '../pages/staff/StaffDashboard';
import SearchPage from '../pages/search/SearchPage';
import AuctionPage from '../pages/auction/AuctionPage';
import ProductDetailPage from '../pages/product/ProductDetailPage';
import CartPage from '../pages/cart/CartPage';
import AdminPage from '../pages/adminDasboard/adminPage';
import GuestLayout from '../layouts/GuestLayout';
import AuthLayout from '../layouts/AuthLayout';

export const ROUTES = {
  HOME: '/',
  SEARCH: '/search',
  AUCTION: '/auction',
  PRODUCT: '/product/:id',
  CART: '/cart',
  LOGIN: '/login',
  REGISTER: '/register',
  STAFF: '/staff',
  ADMIN: '/admin',
  ADMIN_TAB: '/admin/:tab',
} as const;

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestLayout />}>
          <Route index element={<HomePage />} />
          <Route path={ROUTES.SEARCH} element={<SearchPage />} />
          <Route path={ROUTES.AUCTION} element={<AuctionPage />} />
          <Route path={ROUTES.PRODUCT} element={<ProductDetailPage />} />
          <Route path={ROUTES.CART} element={<CartPage />} />
        </Route>
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.REGISTER} element={<AuthLayout />}>
          <Route index element={<RegisterPage />} />
        </Route>
        <Route path={ROUTES.STAFF} element={<StaffDashboard />} />
        <Route path={ROUTES.ADMIN} element={<Navigate to="/admin/overview" replace />} />
        <Route path={ROUTES.ADMIN_TAB} element={<AdminPage />} />
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
