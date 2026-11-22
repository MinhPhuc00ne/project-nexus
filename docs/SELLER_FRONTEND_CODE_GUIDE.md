# Seller Frontend Code Guide

> Tài liệu local để trình bày phần Seller. File này **không được commit/push**.

## 1. Điểm vào và bảo vệ quyền Seller

| Mục           | File                                                 | Vai trò                                                               |
| ------------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| Route Seller  | `frontend/src/routes/AppRouter.tsx`                  | Khai báo toàn bộ URL `/seller/*`.                                     |
| Layout        | `frontend/src/layouts/SellerLayout.tsx`              | Sidebar, header, thông báo và `Outlet` cho các trang Seller.          |
| Session guard | `frontend/src/components/seller/SellerSession.tsx`   | Kiểm tra tài khoản đăng nhập/quyền Seller trước khi render workspace. |
| State chung   | `frontend/src/components/seller/SellerWorkspace.tsx` | Context chung: draft, toast, refresh dữ liệu giữa các trang.          |

Route chính:

```tsx
<Route path={ROUTES.SELLER} element={<SellerSession />}>
  <Route element={<SellerLayout />}>
    <Route index element={<Navigate to="overview" replace />} />
    <Route path="overview" element={<SellerDashboardPage />} />
    <Route path="products" element={<SellerProductsPage />} />
    <Route path="products/new" element={<SellerCreateProductPage />} />
    <Route path="orders" element={<SellerOrdersPage />} />
    <Route path="shipping" element={<SellerShippingPage />} />
    <Route path="auctions" element={<SellerAuctionsPage />} />
    <Route path="finance" element={<SellerFinancePage />} />
  </Route>
</Route>
```

Nói khi trình bày: `SellerSession` là lớp kiểm tra phiên/quyền; `SellerLayout` chỉ phụ trách giao diện dùng chung. Mỗi route con render trong `Outlet` của layout.

## 2. Tổng quan Seller

| Luồng                | UI                                        | API/service                                                        |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| Dashboard            | `pages/seller/SellerDashboardPage.tsx`    | Dùng các panel trong `components/seller/SellerOverviewPanels.tsx`. |
| Thẻ điều hướng       | `SellerOverviewPanels.tsx`                | Chuyển tới orders, products, finance, auctions.                    |
| Trạng thái tài khoản | `SellerSession.tsx`, `services/seller.ts` | `getSellerSession()` lấy profile đăng nhập.                        |

Mẫu gọi API trong service:

```ts
export async function getSellerSession(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/users/me', { requireAuth: true });
}
```

`requireAuth: true` khiến interceptor đính kèm access token. Nếu token hết hạn hoặc role không phù hợp, FE nhận lỗi từ API và session guard không cho vào Seller workspace.

## 3. Quản lý sản phẩm và kho

| Luồng                  | File UI                       | File xử lý/gọi API                                   |
| ---------------------- | ----------------------------- | ---------------------------------------------------- |
| Danh sách sản phẩm/kho | `SellerProductsPage.tsx`      | `services/sellerProducts.ts`, `useSellerProducts.ts` |
| Tạo/sửa sản phẩm       | `SellerCreateProductPage.tsx` | `useSellerProductForm.ts`, `sellerProducts.ts`       |
| Upload ảnh             | `SellerProductImages.tsx`     | `validateProductImages`, media upload trong form     |
| Ẩn/mở bán lại          | `SellerProductsPage.tsx`      | `hideSellerProduct`, `reactivateSellerProduct`       |
| Sale sản phẩm          | `SellerCreateProductPage.tsx` | `updateProductSale`                                  |

Các hàm quan trọng:

```ts
export function getMyProducts(): Promise<SellerProduct[]> {
  return getSellerResource<SellerProduct[]>('/seller/products');
}

export async function publishSellerProduct(payload: CreateProductPayload): Promise<SellerProduct> {
  return getSellerResource<SellerProduct>('/seller/products', {
    method: 'POST',
    body: payload,
  });
}

export function updateProductSale(id: string, sale: ProductSaleInput) {
  return getSellerResource<SellerProduct>(`/seller/products/${id}/sale`, {
    method: 'PATCH',
    body: sale,
  });
}
```

`buildProductPayload()` chuẩn hóa dữ liệu form trước khi POST: tên, category, giá, tồn kho, mô tả, ảnh và option. `validateProductImages()` chặn file vượt số lượng/dung lượng/định dạng trước khi gọi server.

### Option màu, size

`SellerCreateProductPage.tsx` quản lý các nhóm option bằng state như `optionGroups` và `newOptionInput`. Seller thêm nhóm `Màu sắc`, `Kích thước` và các value. Payload gửi API chứa danh sách options; BE là nơi lưu option/variant vào DB và trả lại để Buyer chọn khi mua.

## 4. Đơn hàng và GHN

| Luồng                | UI                                                       | API                                           |
| -------------------- | -------------------------------------------------------- | --------------------------------------------- |
| Danh sách đơn        | `SellerOrdersPage.tsx`, `SellerOrderPanels.tsx`          | `getSellerOrders()`                           |
| Chi tiết đơn         | `SellerOrderDetailPage.tsx`, `SellerLiveOrderDetail.tsx` | `getSellerOrderDetail()`                      |
| Xác nhận đơn         | `SellerOrderActions.tsx`                                 | `confirmSellerOrder()`                        |
| Tạo/bàn giao vận đơn | `SellerDispatchModal.tsx`                                | `dispatchSellerOrder()`                       |
| Tính phí GHN         | `SellerShippingResult.tsx`                               | `getSellerOrderShippingQuote()`               |
| In vận đơn           | `SellerWaybillModal.tsx`, `SellerWaybillSheet.tsx`       | `getSellerWaybill()`, `getOfficialGhnLabel()` |
| Đồng bộ GHN          | Order detail                                             | `reconcileSellerGhnOrder()`                   |

Ví dụ dispatch vận đơn:

```ts
export async function dispatchSellerOrder(id: string, body: DispatchGhnRequest) {
  return apiRequest<SellerOrderDetail>(`/seller/orders/${encodeURIComponent(id)}/dispatch-ghn`, {
    method: 'POST',
    body,
    requireAuth: true,
  });
}
```

Luồng: Seller mở đơn → xác nhận → nhập cân nặng/kích thước/thông tin giao nhận trong modal → FE POST dispatch → BE gọi GHN/lưu shipment → FE refresh chi tiết đơn và hiển thị waybill/tracking.

## 5. Địa chỉ lấy hàng GHN

| File                                           | Vai trò                   |
| ---------------------------------------------- | ------------------------- |
| `pages/seller/SellerShippingPage.tsx`          | Trang cài đặt vận chuyển. |
| `components/seller/SellerPickupPointPanel.tsx` | Form điểm lấy hàng.       |
| `services/sellerPickup.ts`                     | API lấy/lưu pickup point. |

```ts
export function getSellerPickupPoint(): Promise<SellerPickupPoint | null> {
  return apiRequest<SellerPickupPoint | null>('/seller/shipping/pickup-point', {
    requireAuth: true,
  });
}

export function saveSellerPickupPoint(body: SellerPickupPoint): Promise<SellerPickupPoint> {
  return apiRequest<SellerPickupPoint>('/seller/shipping/pickup-point', {
    method: 'PUT',
    body,
    requireAuth: true,
  });
}
```

Seller phải có pickup point trước khi dispatch đơn. Nếu chưa thiết lập, checkout/dispatch sẽ hiển thị thông báo yêu cầu lưu địa chỉ lấy hàng GHN.

## 6. Đấu giá và ký gửi vật phẩm

| Luồng                             | UI                                                              | API/service                                             |
| --------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| Danh sách phiên                   | `SellerAuctionsPage.tsx`                                        | `getAuctionsApi()`                                      |
| Xem chi tiết/live showcase Seller | `SellerAuctionDetailPage.tsx`                                   | `getAuctionDetailApi()`, `getAuctionIntroShowcaseApi()` |
| Gửi vật phẩm ký gửi               | `SellerAuctionConsignmentPage.tsx`, `SellerConsignmentForm.tsx` | `registerAuctionItemApi()`                              |
| Theo dõi duyệt/từ chối            | `SellerConsignmentHistoryPanel.tsx`                             | `getSellerAuctionConsignmentsApi()`                     |
| Socket phiên đấu giá              | `services/auction.service.ts`                                   | `createAuctionSocket()`                                 |

Ví dụ gửi vật phẩm vào một phiên:

```ts
export function registerAuctionItemApi(auctionId: string, body: RegisterAuctionItemInput) {
  return apiRequest<RegisterAuctionItemResponse>(`/auctions/${auctionId}/items`, {
    method: 'POST',
    body,
    requireAuth: true,
  });
}
```

Luồng nghiệp vụ:

1. Seller mở `/seller/auctions` để xem phiên đang nhận ký gửi.
2. Bấm **Gửi vật phẩm đấu giá** vào `/seller/auctions/new`.
3. `SellerConsignmentForm` kiểm tra giá khởi điểm, bước giá, ảnh vật phẩm/chứng thư.
4. `registerAuctionItemApi()` gửi hồ sơ lên BE với trạng thái chờ thẩm định.
5. Admin duyệt hoặc từ chối; `SellerConsignmentHistoryPanel` hiển thị trạng thái và lý do.
6. Khi Admin bắt đầu phiên, Seller nhận notification và có thể xem live showcase tại route Seller riêng.

Seller chỉ xem showcase/tiến trình, không có nút đặt giá. Đặt giá là luồng Buyer.

## 7. Tài chính, ví escrow và rút tiền

| Luồng              | UI                                                  | API                        |
| ------------------ | --------------------------------------------------- | -------------------------- |
| Tổng doanh thu     | `SellerFinancePage.tsx`, `SellerFinanceSummary.tsx` | `getSellerRevenue()`       |
| Lịch sử giao dịch  | `SellerFinanceHistory.tsx`                          | `getSellerTransactions()`  |
| Danh sách rút tiền | `SellerFinancePage.tsx`                             | `getSellerWithdrawals()`   |
| Tạo yêu cầu rút    | `SellerWithdrawalModal.tsx`                         | `createSellerWithdrawal()` |
| Chi tiết yêu cầu   | `SellerWithdrawalDetail.tsx`                        | Dữ liệu withdrawal API     |

```ts
export async function createSellerWithdrawal(body: CreateWithdrawal): Promise<WithdrawalResult> {
  return getSellerResource<WithdrawalResult>('/seller/finance/withdrawals', {
    method: 'POST',
    body,
  });
}
```

FE chỉ gửi số tiền và thông tin yêu cầu. BE kiểm tra ví, số dư, trạng thái escrow, tài khoản ngân hàng và tạo withdrawal request.

## 8. Đánh giá và khiếu nại

| Luồng               | UI                          | API                            |
| ------------------- | --------------------------- | ------------------------------ |
| Review sản phẩm     | `SellerReviewsPage.tsx`     | `getSellerProductReviewsApi()` |
| Review shop         | `SellerReviewsPage.tsx`     | `getSellerShopReviewsApi()`    |
| Danh sách khiếu nại | `SellerDisputesPage.tsx`    | `getSellerDisputes()`          |
| Seller giải trình   | `SellerDisputeResponse.tsx` | `respondSellerDispute()`       |
| Upload bằng chứng   | `SellerDisputeResponse.tsx` | `uploadDisputeEvidence()`      |

```ts
export function getSellerShopReviewsApi(page = 1, limit = 50) {
  return apiRequest<SellerShopReviewsResponse>(`/seller/reviews/shop?page=${page}&limit=${limit}`, {
    requireAuth: true,
  });
}

export async function respondSellerDispute(disputeId: string, body: SellerDisputeResponseInput) {
  return apiRequest(`/seller/disputes/${disputeId}/response`, {
    method: 'POST',
    body,
    requireAuth: true,
  });
}
```

## 9. Cài đặt shop và hồ sơ

| Luồng               | UI                                                  | API                                                             |
| ------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| Hồ sơ shop          | `SellerSettingsPage.tsx`, `SellerShopInfo.tsx`      | `getSellerShopProfile()`                                        |
| Sửa shop            | `SellerShopEditor.tsx`                              | `updateSellerShopProfile()`                                     |
| Avatar shop riêng   | `SellerShopEditor.tsx`                              | `uploadShopAvatarFile()`                                        |
| Hồ sơ user Seller   | Route `/seller/profile` dùng `BuyerProfilePage.tsx` | `updateMyProfile()`                                             |
| Tài khoản ngân hàng | Profile editor                                      | API profile update                                              |
| Tùy chọn thông báo  | `SellerNotificationPreferences.tsx`                 | `getNotificationPreferences()`, `saveNotificationPreferences()` |

Phân biệt khi trả lời: avatar Shop được cập nhật bởi API shop; avatar cá nhân Seller đi qua API profile. Hai dữ liệu không dùng chung.

## 10. Notification realtime

| File                                          | Vai trò                                                          |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `components/seller/useSellerNotifications.ts` | Hook kết nối/lấy notification của Seller.                        |
| `components/seller/SellerNotifications.tsx`   | UI chuông, danh sách, đánh dấu đã đọc và điều hướng `targetUrl`. |
| `services/notifications.ts`                   | REST get/read/read-all/preferences.                              |
| `services/notificationSocket.ts`              | Client Socket.IO `/ws/notifications`.                            |

Mẫu socket:

```ts
const connection = createNotificationConnection();
connection.socket.on('notification:new', (notification) => {
  setNotifications((items) => [notification, ...items]);
  setUnreadCount(notification.unreadCount ?? 0);
});
connection.socket.on('notification:unread_count', ({ unreadCount }) => {
  setUnreadCount(unreadCount);
});
connection.connect();

return () => connection.disconnect();
```

REST đảm bảo khi load lại trang vẫn có lịch sử notification; WebSocket để badge/danh sách cập nhật ngay khi BE phát event. `targetUrl` giúp bấm notification tới đúng đơn hàng, khiếu nại hoặc phiên đấu giá.

## 11. Danh sách API Seller cần nhớ

| Nhóm           | Hàm FE                                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session        | `getSellerSession`                                                                                                                                                                          |
| Product        | `getMyProducts`, `publishSellerProduct`, `updateProductSale`, `hideSellerProduct`, `reactivateSellerProduct`                                                                                |
| Order/GHN      | `getSellerOrders`, `getSellerOrderDetail`, `confirmSellerOrder`, `dispatchSellerOrder`, `getSellerWaybill`, `getOfficialGhnLabel`, `getSellerOrderShippingQuote`, `reconcileSellerGhnOrder` |
| Pickup         | `getSellerPickupPoint`, `saveSellerPickupPoint`                                                                                                                                             |
| Auction        | `getAuctionsApi`, `getAuctionDetailApi`, `getAuctionIntroShowcaseApi`, `registerAuctionItemApi`, `getSellerAuctionConsignmentsApi`, `createAuctionSocket`                                   |
| Finance        | `getSellerRevenue`, `getSellerTransactions`, `getSellerWithdrawals`, `createSellerWithdrawal`                                                                                               |
| Review/dispute | `getSellerProductReviewsApi`, `getSellerShopReviewsApi`, `getSellerDisputes`, `respondSellerDispute`, `uploadDisputeEvidence`                                                               |
| Shop/profile   | `getSellerShopProfile`, `updateSellerShopProfile`, `uploadShopAvatarFile`, `updateMyProfile`                                                                                                |
| Notifications  | `getNotifications`, `getNotificationUnreadCount`, `markNotificationRead`, `markAllNotificationsRead`, `createNotificationConnection`                                                        |

## 12. Câu trả lời ngắn khi được hỏi

- **FE gọi API ở đâu?** Trong `frontend/src/services/*`; page/component gọi service trong `useEffect` hoặc event submit/click.
- **Tại sao không gọi axios trực tiếp ở component?** Tách service để tái sử dụng, thống nhất token/error/response và dễ test.
- **Seller có tạo phiên đấu giá không?** Không. Admin tạo/mở/đóng phiên; Seller chỉ gửi vật phẩm ký gửi vào phiên đang mở nhận ký gửi.
- **Seller xem live như thế nào?** `SellerAuctionDetailPage` lấy auction/showcase data và subscribe auction socket để theo dõi diễn biến, không có hành động bid.
- **Notification realtime hoạt động thế nào?** FE giữ kết nối Socket.IO `/ws/notifications`; BE tạo notification rồi emit `notification:new` và `notification:unread_count`.
- **Tại sao vẫn gọi REST notification?** Để tải lịch sử và đồng bộ lại khi reload; socket chỉ phục vụ cập nhật tức thì.
