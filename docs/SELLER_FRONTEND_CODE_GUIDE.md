# Seller Frontend Code Guide

Tài liệu này là ghi chú để trình bày phần Frontend Seller của dự án NEXUS.
Không cần học thuộc toàn bộ CSS; cần hiểu luồng dữ liệu, quyền và API.

## 1. Luồng Seller tổng quát

```text
Login
  -> AuthContext lấy GET /users/me
  -> AppRouter kiểm tra Role.SELLER
  -> SellerSession kiểm tra/bật Seller mode
  -> SellerLayout hiển thị dashboard
  -> Page gọi service
  -> apiRequest gửi Bearer token đến Backend
```

Các file gốc:

- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/routes/AppRouter.tsx`
- `frontend/src/components/seller/SellerSession.tsx`
- `frontend/src/layouts/SellerLayout.tsx`
- `frontend/src/services/api.ts`

## 2. Route và quyền Seller

**File:** `frontend/src/routes/AppRouter.tsx`

```tsx
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
    <Route path="products" element={<SellerProductsPage />} />
    <Route path="orders" element={<SellerOrdersPage />} />
    <Route path="shipping" element={<SellerShippingPage />} />
    <Route path="auctions" element={<SellerAuctionsPage />} />
    <Route path="finance" element={<SellerFinancePage />} />
    <Route path="reviews" element={<SellerReviewsPage />} />
    <Route path="disputes" element={<SellerDisputesPage />} />
    <Route path="settings" element={<SellerSettingsPage />} />
  </Route>
</Route>
```

**Dùng để làm gì:** chỉ tài khoản có `role === SELLER` mới vào được `/seller/*`.

**Kết quả:** Buyer bị điều hướng ra ngoài Seller dashboard. Tuy nhiên đây chỉ là chặn giao diện; Backend vẫn phải kiểm tra JWT, role và quyền sở hữu dữ liệu.

## 3. AuthContext: role và mode Buyer/Seller

**File:** `frontend/src/contexts/AuthContext.tsx`

```ts
const role = user?.role || storedUser?.role;
const isSeller = role === Role.SELLER;

const activeMode: 'SELLER' | 'BUYER' =
  isSeller && user?.isSellerActive && user?.currentMode === 'SELLER' ? 'SELLER' : 'BUYER';
```

**Ý nghĩa:**

- `role`: quyền thật của tài khoản, ví dụ `SELLER`.
- `activeMode`: giao diện hiện tại đang là Seller hay Buyer.
- Seller có thể về giao diện Buyer để mua hàng mà không mất `role = SELLER`.

### Chuyển mode

```ts
const switchActiveMode = useCallback(async (mode: 'SELLER' | 'BUYER') => {
  const wantSeller = mode === 'SELLER';
  const res = await toggleSellerMode(wantSeller);

  setUserState((prev) => {
    if (!prev) return prev;
    const finalActive = res?.isSellerActive ?? (wantSeller && !prev.isShopSuspended);
    const finalMode = finalActive ? 'SELLER' : 'BUYER';
    setStoredActiveMode(prev.id, finalMode);
    return { ...prev, isSellerActive: finalActive, currentMode: finalMode };
  });
}, []);
```

**API:** `PATCH /users/toggle-seller`

```ts
export function toggleSellerMode(isSellerActive?: boolean) {
  return apiRequest<ToggleSellerResponse>('/users/toggle-seller', {
    method: 'PATCH',
    body: { isSellerActive },
    requireAuth: true,
  });
}
```

**Giải thích:** FE gọi API trước, chỉ cập nhật state sau khi BE trả kết quả. `requireAuth: true` yêu cầu `apiRequest` gắn Bearer token.

## 4. SellerSession

**File:** `frontend/src/components/seller/SellerSession.tsx`

```ts
const needsSellerMode = Boolean(
  user &&
  user.role === Role.SELLER &&
  !user.isShopSuspended &&
  (!user.isSellerActive || user.currentMode !== 'SELLER'),
);

useEffect(() => {
  if (!needsSellerMode || modeError) return;
  void switchActiveMode('SELLER').catch((error: unknown) => {
    setModeError(error instanceof Error ? error.message : 'Không thể chuyển mode Seller.');
  });
}, [modeError, needsSellerMode, switchActiveMode]);
```

**Dùng để làm gì:** nếu Seller truy cập `/seller/*` nhưng đang ở Buyer mode, component tự chuyển về Seller mode.

**Kết quả:** tránh tình trạng URL là `/seller` nhưng `currentMode` vẫn là `BUYER`.

## 5. Lớp gọi API chung

**File:** `frontend/src/services/api.ts`

Các Seller service đều dùng mẫu:

```ts
apiRequest<ResponseType>(url, {
  method: 'POST',
  body: payload,
  requireAuth: true,
});
```

**Ý nghĩa:**

- `ResponseType`: TypeScript kiểm tra kiểu response.
- `url`: endpoint Backend.
- `method`: HTTP method.
- `body`: DTO gửi lên BE.
- `requireAuth: true`: thêm access token vào `Authorization: Bearer <token>`.

`api.ts` cũng xử lý refresh token khi gặp `401` và chuyển response lỗi của BE thành `Error` cho UI hiển thị.

## 6. Sản phẩm và tồn kho

**Files:**

- `frontend/src/pages/seller/SellerProductsPage.tsx`
- `frontend/src/pages/seller/SellerCreateProductPage.tsx`
- `frontend/src/components/seller/useSellerProductForm.ts`
- `frontend/src/services/sellerProducts.ts`

### Lấy sản phẩm của shop hiện tại

```ts
export function getMyProducts(): Promise<SellerProduct[]> {
  const token = getStoredToken();
  if (!token) return Promise.reject(new Error('Vui lòng đăng nhập bằng tài khoản Seller.'));

  return apiRequest<SellerProduct[]>('/catalog/products/seller/my-products', {
    requireAuth: true,
  });
}
```

**API:** `GET /catalog/products/seller/my-products`

**Kết quả:** BE lấy Seller ID từ JWT, chỉ trả sản phẩm của shop đó; FE không tự truyền `sellerId` nên không thể sửa ID trên browser để xem kho người khác.

### Upload ảnh sản phẩm

```ts
const body = new FormData();
body.append('file', file);
const result = await apiRequest<{ url: string }>('/media/upload', {
  method: 'POST',
  body,
  isFormData: true,
  requireAuth: true,
});
```

**API:** `POST /media/upload`

**Kết quả:** BE trả URL ảnh. FE gom các URL đó vào mảng `images` rồi mới tạo/sửa sản phẩm.

### Tạo hoặc sửa sản phẩm

```ts
const body: Partial<CreateSellerProduct> = {
  ...payload,
  images,
  ...(cleanedOptions?.length ? { options: cleanedOptions } : { options: [] }),
};

return apiRequest<{ id: string; title: string }>(
  edit ? `/catalog/products/${encodeURIComponent(edit.product.id)}` : '/catalog/products',
  {
    method: edit ? 'PATCH' : 'POST',
    body,
    requireAuth: true,
  },
);
```

**API:**

- `POST /catalog/products`: tạo sản phẩm.
- `PATCH /catalog/products/:id`: sửa sản phẩm.

`encodeURIComponent` giúp ID an toàn khi đặt vào URL.

### Màu sắc, size và option

```ts
const cleanedOptions = options
  ?.map((option) => ({
    name: option.name.trim(),
    values: Array.from(new Set(option.values.map((value) => value.trim()).filter(Boolean))),
  }))
  .filter((option) => option.name && option.values.length > 0);
```

**Dùng để làm gì:** chuẩn hóa option trước khi gửi BE.

- `trim()`: bỏ khoảng trắng thừa.
- `filter(Boolean)`: bỏ giá trị rỗng.
- `new Set(...)`: bỏ lựa chọn bị trùng.

Payload ví dụ:

```json
{
  "options": [
    { "name": "Màu sắc", "values": ["Đen", "Trắng"] },
    { "name": "Kích cỡ", "values": ["S", "M", "L"] }
  ]
}
```

### Sale

```ts
export function updateProductSale(productId: string, sale: ProductSaleInput) {
  return apiRequest<SellerProduct>(`/catalog/products/${encodeURIComponent(productId)}/sale`, {
    method: 'PATCH',
    body: sale,
    requireAuth: true,
  });
}
```

**API:** `PATCH /catalog/products/:id/sale`

Payload có `salePrice`, `saleStartsAt`, `saleEndsAt`. Gửi `salePrice: null` để tắt sale.

## 7. Đơn bán và GHN

**Files:**

- `frontend/src/pages/seller/SellerOrdersPage.tsx`
- `frontend/src/pages/seller/SellerOrderDetailPage.tsx`
- `frontend/src/services/sellerOrders.ts`

| Chức năng     | API                                      |
| ------------- | ---------------------------------------- |
| Danh sách đơn | `GET /seller/orders?page=&limit=`        |
| Chi tiết đơn  | `GET /seller/orders/:id`                 |
| Xác nhận đơn  | `POST /seller/orders/:id/confirm`        |
| Báo giá GHN   | `POST /seller/orders/:id/shipping-quote` |
| Bàn giao GHN  | `POST /seller/orders/:id/dispatch-ghn`   |
| Đồng bộ GHN   | `POST /seller/orders/:id/reconcile-ghn`  |
| In vận đơn    | `GET /seller/orders/:id/print-waybill`   |

### Tạo vận đơn GHN an toàn

```ts
const current = await getSellerOrderDetail(id, sellerId);
if (!['PAID', 'PREPARING'].includes(current.status)) {
  throw new Error('Chỉ có thể bàn giao đơn đã thanh toán hoặc đang chuẩn bị.');
}

const result = await apiRequest(`${base}/${encodeURIComponent(id)}/dispatch-ghn`, {
  method: 'POST',
  body,
  requireAuth: true,
});
```

Sau khi dispatch, FE gọi lại chi tiết đơn và kiểm tra mã vận đơn GHN. Không tự retry request tạo đơn GHN vì có nguy cơ tạo trùng vận đơn.

## 8. Shop, logo và điểm lấy hàng

**Files:**

- `frontend/src/pages/seller/SellerSettingsPage.tsx`
- `frontend/src/components/seller/SellerShopEditor.tsx`
- `frontend/src/services/shops.ts`
- `frontend/src/services/sellerPickup.ts`

| Chức năng        | API                                 |
| ---------------- | ----------------------------------- |
| Lấy hồ sơ shop   | `GET /seller/shop-profile`          |
| Sửa hồ sơ shop   | `PATCH /seller/shop-profile`        |
| Upload logo shop | `POST /media/upload`                |
| Lấy điểm lấy GHN | `GET /seller/shipping/pickup-point` |
| Lưu điểm lấy GHN | `PUT /seller/shipping/pickup-point` |

### Avatar shop phải độc lập avatar Seller

**File:** `frontend/src/services/products.service.ts`

```ts
shop: {
  id: product?.seller?.id,
  name: product?.seller?.fullName ?? 'Chưa có thông tin người bán',
  avatarUrl: product?.seller?.shopAvatarUrl ?? undefined,
}
```

`avatarUrl` là avatar cá nhân. `shopAvatarUrl` là logo gian hàng. Trang sản phẩm phải dùng `shopAvatarUrl` để không lẫn hai loại ảnh.

## 9. Tài chính và rút tiền

**Files:** `SellerFinancePage.tsx`, `sellerFinance.ts`, `SellerWithdrawalModal.tsx`.

| Chức năng        | API                                |
| ---------------- | ---------------------------------- |
| Doanh thu        | `GET /seller/finance/revenue`      |
| Giao dịch        | `GET /seller/finance/transactions` |
| Yêu cầu rút tiền | `GET /seller/finance/withdrawals`  |
| Tạo yêu cầu rút  | `POST /seller/finance/withdraw`    |

```ts
export async function createSellerWithdrawal(body: CreateWithdrawal) {
  const result = await apiRequest<WithdrawalResult>('/seller/finance/withdraw', {
    method: 'POST',
    body,
    requireAuth: true,
  });
  if (!result.success) throw new Error(result.message);
  return result;
}
```

FE chỉ gửi yêu cầu; BE kiểm tra số dư, escrow và thông tin tài khoản ngân hàng.

## 10. Đánh giá Seller nhận được

**Files:** `SellerReviewsPage.tsx`, `reviews.service.ts`.

```ts
void Promise.all([getSellerProductReviewsApi(), getSellerShopReviewsApi()]).then(
  ([productResponse, shopResponse]) => {
    const productReviews = productResponse.items.map((review) => ({
      ...review,
      kind: 'PRODUCT' as const,
    }));
    const shopReviews = shopResponse.items.map((review) => ({
      ...review,
      kind: 'SHOP' as const,
    }));
    setReviews([...productReviews, ...shopReviews]);
  },
);
```

| Loại review                    | API                           |
| ------------------------------ | ----------------------------- |
| Đánh giá sản phẩm Seller nhận  | `GET /seller/product-reviews` |
| Đánh giá gian hàng Seller nhận | `GET /seller/reviews`         |

`Promise.all` gọi hai API song song. `kind` giúp UI hiển thị nhãn “Đánh giá sản phẩm” hoặc “Đánh giá gian hàng”.

## 11. Khiếu nại và giải trình

**Files:** `SellerDisputesPage.tsx`, `sellerDisputes.ts`.

```ts
export async function respondSellerDispute(
  id: string,
  responseNotes: string,
  evidenceUrls: string[],
) {
  return apiRequest(`/seller/disputes/${encodeURIComponent(id)}/respond`, {
    method: 'POST',
    body: { responseNotes: responseNotes.trim(), evidenceUrls },
    requireAuth: true,
  });
}
```

| Chức năng         | API                                 |
| ----------------- | ----------------------------------- |
| Xem khiếu nại     | `GET /seller/disputes`              |
| Gửi giải trình    | `POST /seller/disputes/:id/respond` |
| Upload bằng chứng | `POST /media/upload`                |

Payload giải trình:

```json
{
  "responseNotes": "Nội dung giải trình của Seller",
  "evidenceUrls": ["https://example.com/proof.jpg"]
}
```

## 12. Đấu giá và ký gửi

**Files:**

- `frontend/src/pages/seller/SellerAuctionsPage.tsx`
- `frontend/src/pages/seller/SellerAuctionConsignmentPage.tsx`
- `frontend/src/components/seller/SellerConsignmentForm.tsx`
- `frontend/src/services/auction.service.ts`

| Chức năng                  | API                                       |
| -------------------------- | ----------------------------------------- |
| Lấy phiên đấu giá          | `GET /auctions`                           |
| Lấy vật phẩm Seller đã gửi | `GET /auctions/seller/my-items`           |
| Gửi vật phẩm vào phiên     | `POST /auctions/:auctionId/register-item` |

Luồng: Seller chọn một phiên -> URL có `?auctionId=...` -> form chọn sẵn phiên -> Seller gửi sản phẩm để Admin thẩm định. Seller không tự tạo hoặc phê duyệt phiên đấu giá.

## 13. Thông báo Seller

**Files:** `useSellerNotifications.ts`, `notifications.ts`.

| Chức năng           | API                                  |
| ------------------- | ------------------------------------ |
| Danh sách thông báo | `GET /notifications`                 |
| Số chưa đọc         | `GET /notifications/unread-count`    |
| Đánh dấu đã đọc     | `PATCH /notifications/:id/read`      |
| Đọc toàn bộ         | `PATCH /notifications/read-all`      |
| Tùy chọn thông báo  | `GET/PUT /notifications/preferences` |

## 14. Hồ sơ cá nhân Seller

**Files:** `ProfileEditor.tsx`, `profile.ts`.

```ts
const changes: ProfileChanges = {};
if (normalizedForm.fullName !== savedForm.fullName) changes.fullName = normalizedForm.fullName;
if (normalizedForm.phoneNumber !== savedForm.phoneNumber) {
  changes.phoneNumber = normalizedForm.phoneNumber;
}
if (avatarFile || normalizedForm.avatarUrl !== savedForm.avatarUrl) {
  changes.avatarUrl = normalizedForm.avatarUrl;
}
```

**Dùng để làm gì:** chỉ gửi field đã thay đổi. Ví dụ chỉ đổi số điện thoại thì payload chỉ có `phoneNumber`.

```ts
const reauth = await apiRequest<{ verificationToken: string }>('/auth/profile/reauthenticate', {
  method: 'POST',
  body: { password },
  requireAuth: true,
});

await apiRequest('/buyer/profile', {
  method: 'PATCH',
  body: { ...savedChanges, verificationToken: reauth.verificationToken },
  requireAuth: true,
});
```

Seller phải re-authenticate bằng mật khẩu trước khi đổi profile. Endpoint tên `/buyer/profile` nhưng Backend cho cả Buyer và Seller cập nhật thông tin cá nhân tại đây.

## 15. Câu trả lời ngắn khi được hỏi

- **FE có bảo mật hoàn toàn không?** Không. FE chặn route/UI; BE phải kiểm tra quyền thật.
- **Tại sao có `requireAuth`?** Để request mang Bearer token.
- **Tại sao dùng `encodeURIComponent`?** Tránh ID có ký tự đặc biệt làm hỏng URL.
- **Tại sao `Promise.all`?** Hai API độc lập, gọi song song giúp tải nhanh hơn.
- **Seller role và Seller mode khác nhau thế nào?** Role là quyền tài khoản; mode là giao diện đang sử dụng.
- **Test API thế nào?** Mở F12 -> Network -> Fetch/XHR, kiểm tra URL, payload, status và response.

## 16. Danh mục đầy đủ file FE liên quan đến Seller

Phần này dùng để tra nhanh khi bị hỏi tên file. Các file dưới đây là toàn bộ phần trực tiếp phục vụ Seller, ngoài các file chung như `api.ts`, `AuthContext.tsx`, type dùng chung và UI chung.

### 16.1. Route, session, layout và điều hướng

| File                                        | Vai trò                                  | Điểm cần nhớ                                                       |
| ------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------ |
| `routes/AppRouter.tsx`                      | Khai báo toàn bộ route `/seller/*`       | Bọc bằng `ProtectedRoute` và `SellerSession`                       |
| `components/seller/SellerSession.tsx`       | Kiểm tra Seller session                  | Tự gọi chuyển Seller mode khi cần                                  |
| `layouts/SellerLayout.tsx`                  | Khung Seller Center                      | Sidebar, topbar, Outlet, workspace context                         |
| `components/seller/SellerWorkspace.tsx`     | Context dữ liệu dùng trong Seller layout | Chứa preview/draft state dùng chung                                |
| `components/seller/useSellerStore.ts`       | Hook lấy/làm mới thông tin shop          | Cầu nối giữa layout và shop profile                                |
| `components/seller/SellerUI.tsx`            | UI primitive Seller                      | `PageHeading`, `Panel`, `SellerButton`, `SellerLink`, `EmptyState` |
| `components/headers/HomeHeader.tsx`         | Header ngoài Buyer/Guest                 | Nút vào Seller hoặc mở form nâng cấp Seller                        |
| `components/headers/UserDropdownMenu.tsx`   | Menu tài khoản                           | Gọi `switchActiveMode('BUYER'/'SELLER')`                           |
| `components/headers/UpgradeSellerModal.tsx` | Form đăng ký thành Seller                | Gửi hồ sơ nâng cấp qua `/users/seller-request`                     |

### 16.2. Toàn bộ route Seller hiện được mount

| Route                           | Page                               | Component/service chính                                                             | API chính                                                   |
| ------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `/seller` và `/seller/overview` | `SellerDashboardPage.tsx`          | `SellerOverviewPanels.tsx`, `SellerOrderPanels.tsx`                                 | Dữ liệu shop, đơn và tài chính liên quan                    |
| `/seller/products`              | `SellerProductsPage.tsx`           | `useSellerProducts.ts`, `sellerProducts.ts`                                         | `GET /catalog/products/seller/my-products`                  |
| `/seller/products/new`          | `SellerCreateProductPage.tsx`      | `useSellerProductForm.ts`, `SellerProductImages.tsx`                                | `POST /catalog/products`, `POST /media/upload`              |
| `/seller/products/:id/edit`     | `SellerCreateProductPage.tsx`      | Cùng form tạo sản phẩm                                                              | `PATCH /catalog/products/:id`                               |
| `/seller/inventory`             | `SellerProductsPage.tsx`           | Reuse trang sản phẩm với prop `inventory`                                           | API sản phẩm Seller                                         |
| `/seller/orders`                | `SellerOrdersPage.tsx`             | `sellerOrders.ts`, `SellerPagination.tsx`                                           | `GET /seller/orders`                                        |
| `/seller/orders/:id`            | `SellerOrderDetailPage.tsx`        | `SellerOrderActions.tsx`, `SellerDispatchModal.tsx`, `SellerWaybillModal.tsx`       | Detail/confirm/dispatch/print GHN                           |
| `/seller/shipping`              | `SellerShippingPage.tsx`           | `SellerPickupPointPanel.tsx`, `GhnLocationPicker.tsx`                               | `GET/PUT /seller/shipping/pickup-point`                     |
| `/seller/auctions`              | `SellerAuctionsPage.tsx`           | `sellerData.ts`, `auction.service.ts`                                               | `GET /auctions`, `GET /auctions/seller/my-items`            |
| `/seller/auctions/new`          | `SellerAuctionConsignmentPage.tsx` | `SellerConsignmentForm.tsx`, `SellerConsignmentHistoryPanel.tsx`                    | `POST /auctions/:id/register-item`                          |
| `/seller/finance`               | `SellerFinancePage.tsx`            | `SellerFinanceSummary.tsx`, `SellerFinanceHistory.tsx`, `SellerWithdrawalModal.tsx` | `/seller/finance/*`                                         |
| `/seller/reviews`               | `SellerReviewsPage.tsx`            | `reviews.service.ts`                                                                | `GET /seller/product-reviews`, `GET /seller/reviews`        |
| `/seller/disputes`              | `SellerDisputesPage.tsx`           | `SellerDisputeResponse.tsx`, `sellerDisputes.ts`                                    | `GET /seller/disputes`, `POST /seller/disputes/:id/respond` |
| `/seller/settings`              | `SellerSettingsPage.tsx`           | `SellerShopEditor.tsx`, `SellerNotificationPreferences.tsx`                         | Shop profile và notification preferences                    |
| `/seller/profile`               | `BuyerProfilePage.tsx`             | `ProfileEditor.tsx`                                                                 | Reuse hồ sơ cá nhân; `PATCH /buyer/profile`                 |

`SellerDraftPage.tsx` là file cũ/dự phòng; hiện không có route Seller nào mount nó trong `AppRouter.tsx`.

### 16.3. Sản phẩm, kho và Sale: file con

| File                                        | Dùng để làm gì                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `services/sellerProducts.ts`                | Service CRUD sản phẩm, danh mục, upload ảnh, sale, ẩn/mở bán           |
| `components/seller/useSellerProducts.ts`    | Hook tải lại danh sách sản phẩm, loading/error state                   |
| `components/seller/useSellerProductForm.ts` | State form, validate, upload, create/update và cập nhật sale           |
| `components/seller/SellerProductImages.tsx` | Chọn/xem/xóa ảnh trước khi upload                                      |
| `services/productExtras.ts`                 | Kiểu `ProductOptionGroup`, `ProductSaleConfig`, tính giá sale hiệu lực |
| `services/products.service.ts`              | Map response catalog/detail sang type UI; chứa mapping `shopAvatarUrl` |
| `types/product.types.ts`                    | Type sản phẩm, shop hiển thị, option và sale                           |

### 16.4. Đơn bán, vận chuyển, vận đơn GHN: file con

| File                                          | Dùng để làm gì                                                |
| --------------------------------------------- | ------------------------------------------------------------- |
| `services/sellerOrders.ts`                    | Lấy đơn, xác nhận, dispatch GHN, quote, reconcile, in vận đơn |
| `components/seller/SellerOrderActions.tsx`    | Nút xác nhận, tạo vận đơn, in vận đơn                         |
| `components/seller/SellerDispatchModal.tsx`   | Form khối lượng/kích thước khi giao GHN                       |
| `components/seller/SellerWaybillModal.tsx`    | Popup xem/in vận đơn                                          |
| `components/seller/SellerWaybillSheet.tsx`    | Layout phiếu vận đơn in được                                  |
| `components/seller/SellerLiveOrderDetail.tsx` | Hiển thị trạng thái đơn/vận chuyển cập nhật                   |
| `components/seller/SellerOrderPanels.tsx`     | Panel tóm tắt đơn trong dashboard                             |
| `components/seller/SellerShippingResult.tsx`  | Hiển thị kết quả quote/dispatch GHN                           |
| `components/seller/orderPresentation.ts`      | Hàm format trạng thái, tiền tệ và nhãn đơn                    |
| `types/order.types.ts`                        | Type order, shipment, waybill, request GHN                    |
| `types/shipping.types.ts`                     | Type báo giá và khoảng cách vận chuyển                        |

### 16.5. Shop profile, pickup point và thông tin công khai shop

| File                                           | Dùng để làm gì                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| `services/shops.ts`                            | `GET/PATCH /seller/shop-profile`, upload shop avatar, lấy shop công khai |
| `components/seller/SellerShopEditor.tsx`       | Sửa tên/mô tả/logo/liên hệ/địa chỉ shop                                  |
| `components/seller/sellerShopForm.ts`          | Chuyển shop profile từ API sang dữ liệu form                             |
| `components/seller/SellerShopInfo.tsx`         | Thông tin shop trên Seller dashboard                                     |
| `services/sellerPickup.ts`                     | API điểm lấy hàng GHN của Seller                                         |
| `components/seller/SellerPickupPointPanel.tsx` | Form cài đặt điểm lấy hàng                                               |
| `components/seller/GhnLocationPicker.tsx`      | Chọn tỉnh/quận/phường phục vụ GHN                                        |
| `types/shop.types.ts`                          | Type shop public và Seller shop profile                                  |
| `pages/guest/ShopDetailPage.tsx`               | Trang Buyer/Guest xem shop Seller                                        |
| `components/shop/ShopHeader.tsx`               | Header shop, logo, chat, nút báo cáo shop                                |
| `components/shop/ShopProductGrid.tsx`          | Danh sách sản phẩm thuộc shop                                            |
| `components/shop/ShopReviewsSection.tsx`       | Đánh giá shop công khai                                                  |

### 16.6. Tài chính, đánh giá, khiếu nại, thông báo

| Nhóm                          | Service/page/component                                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tài chính                     | `sellerFinance.ts`, `SellerFinancePage.tsx`, `SellerFinanceSummary.tsx`, `SellerFinanceHistory.tsx`, `SellerWithdrawalModal.tsx`, `SellerWithdrawalDetail.tsx`, `financeFormat.ts`, `types/seller-finance.types.ts` |
| Đánh giá Seller nhận          | `reviews.service.ts`, `SellerReviewsPage.tsx`, `types` review trong service                                                                                                                                         |
| Khiếu nại Seller              | `sellerDisputes.ts`, `SellerDisputesPage.tsx`, `SellerDisputeResponse.tsx`, `types/seller-dispute.types.ts`                                                                                                         |
| Thông báo Seller              | `notifications.ts`, `useSellerNotifications.ts`, `SellerNotifications.tsx`, `SellerNotificationPreferences.tsx`, `types/notification.types.ts`                                                                      |
| Báo cáo vi phạm shop/sản phẩm | `reports.service.ts`, `ReportModal.tsx`, `ProductShopBanner.tsx`, `ProductDetailPage.tsx`                                                                                                                           |

### 16.7. Đấu giá và ký gửi: file con

| File                                                  | Dùng để làm gì                                           |
| ----------------------------------------------------- | -------------------------------------------------------- |
| `services/auction.service.ts`                         | API phiên, chi tiết, ký gửi, bid, socket đấu giá         |
| `pages/seller/SellerAuctionsPage.tsx`                 | Danh sách phiên và nút thêm sản phẩm theo từng phiên     |
| `pages/seller/SellerAuctionConsignmentPage.tsx`       | Trang gửi vật phẩm vào phiên                             |
| `components/seller/SellerConsignmentForm.tsx`         | Form giá khởi điểm, reserve price, ảnh, chứng từ         |
| `components/seller/sellerConsignmentHelpers.ts`       | Validate/map data ký gửi                                 |
| `components/seller/SellerConsignmentHistoryPanel.tsx` | Lịch sử vật phẩm Seller đã gửi                           |
| `types/auction.types.ts`                              | Type auction, bid, item, status                          |
| `pages/guest/AuctionPage.tsx`                         | Buyer/Guest xem danh sách đấu giá                        |
| `pages/guest/AuctionDetailPage.tsx`                   | Buyer/Guest xem và đặt giá                               |
| `components/auction/*`                                | Gallery, bid terminal, tab chi tiết, auction realtime UI |

### 16.8. Phần Buyer/Guest vẫn liên quan trực tiếp Seller

| File                                                 | Liên quan Seller ở điểm nào                                                |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| `components/productDetail/ProductShopBanner.tsx`     | Hiển thị shop Seller, logo, uy tín, chat và báo cáo shop                   |
| `components/productDetail/ProductReviewsSection.tsx` | Buyer gửi review sản phẩm/shop sau đơn hoàn tất                            |
| `components/productDetail/ReviewItem.tsx`            | Render review người mua đã gửi cho sản phẩm Seller                         |
| `pages/guest/ProductDetailPage.tsx`                  | Hiển thị option Seller tạo, sale, báo cáo sản phẩm                         |
| `components/report/ReportModal.tsx`                  | Modal báo cáo shop hoặc sản phẩm của Seller                                |
| `services/reports.service.ts`                        | Gọi `POST /catalog/products/:id/reports` hoặc `/catalog/shops/:id/reports` |
| `components/orders/OrderReviewModal.tsx`             | Buyer đánh giá sản phẩm/shop sau mua                                       |
| `components/headers/NotificationDropdown.tsx`        | Hiển thị notification chung, gồm notification Seller                       |

### 16.9. Hồ sơ cá nhân và nâng cấp thành Seller

| File                                         | Dùng để làm gì                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| `services/users.ts`                          | `/users/me`, toggle Seller mode, create/history seller upgrade request |
| `components/headers/UpgradeSellerModal.tsx`  | Buyer nộp hồ sơ nâng cấp Seller                                        |
| `components/profile/ProfileEditor.tsx`       | Seller/Buyer sửa tên, SĐT, avatar cá nhân                              |
| `services/profile.ts`                        | Re-authenticate Seller và PATCH profile chỉ với field thay đổi         |
| `components/profile/AvatarPicker.tsx`        | Validate/chọn ảnh avatar cá nhân                                       |
| `components/profile/ChangePasswordModal.tsx` | Đổi password qua OTP                                                   |
| `pages/buyer/BuyerProfilePage.tsx`           | Reuse được tại route `/seller/profile`                                 |
| `types/user.types.ts`                        | `UserProfile`, `ToggleSellerResponse`, `SellerUpgradeRequest`          |
