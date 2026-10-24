import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  deleteAdminProduct,
  getAdminProductById,
  updateAdminProductStatus,
} from '../../services/admin';
import type { AdminProduct, AdminProductDetail } from '../../types/admin-product.types';
import Popup from '../Popup';
import { Button } from './AdminUI';
import { DetailFields } from './CommerceUI';
import { formatMoney } from './adminData';
import { adminProductLabels } from './adminProductData';

export function ProductDetailDialog({
  productId,
  onClose,
}: {
  productId: string;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const [detail, setDetail] = useState<AdminProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setDetail(null);
    void getAdminProductById(productId, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setDetail(value);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Không thể tải chi tiết sản phẩm.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [productId, token, revision]);

  return (
    <Popup
      isOpen
      onClose={onClose}
      title="Chi tiết sản phẩm"
      size="xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      {loading && (
        <p role="status" className="py-8 text-center text-sm text-slate-500">
          Đang tải chi tiết sản phẩm…
        </p>
      )}
      {!loading && error && (
        <div role="alert" className="space-y-3 text-sm text-red-700">
          <p>{error}</p>
          <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
            Thử lại
          </Button>
        </div>
      )}
      {!loading && !error && detail && (
        <div className="space-y-5">
          {detail.images.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {detail.images.map((image) => (
                <img
                  key={image.id}
                  src={image.imageUrl}
                  alt={detail.title}
                  className="aspect-square w-full rounded-xl border border-slate-200 bg-slate-50 object-contain"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Sản phẩm chưa có ảnh.</p>
          )}
          <DetailFields
            fields={[
              ['Mã sản phẩm', detail.id],
              ['Tên sản phẩm', detail.title],
              ['Seller', detail.seller.fullName],
              ['Email seller', detail.seller.email],
              ['Điện thoại seller', detail.seller.phoneNumber],
              [
                'Danh mục',
                [detail.category.parent?.name, detail.category.name].filter(Boolean).join(' / '),
              ],
              ['Giá niêm yết', formatMoney(detail.basePrice)],
              ['Trạng thái', adminProductLabels[detail.status]],
              ['Số lượng có thể bán', String(detail.stockSummary.availableQty)],
              ['Tổng tồn kho', String(detail.stockSummary.totalQty)],
              ['Khối lượng', `${detail.weightGrams} g`],
              [
                'Kích thước (dài × rộng × cao)',
                `${detail.dimensions.lengthCm} × ${detail.dimensions.widthCm} × ${detail.dimensions.heightCm} cm`,
              ],
              ['Mô hình 3D', detail.threeModelKey ? 'Có mô hình 3D' : 'Chưa có'],
              ['Ngày tạo', new Date(detail.createdAt).toLocaleString('vi-VN')],
              ['Cập nhật lần cuối', new Date(detail.updatedAt).toLocaleString('vi-VN')],
            ]}
          />
          <section className="border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-bold">Mô tả</h3>
            <p className="break-words whitespace-pre-wrap text-sm text-slate-600">
              {detail.description || 'Chưa có mô tả.'}
            </p>
          </section>
          <section className="border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-bold">Tồn kho theo kho hàng</h3>
            {detail.inventories.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-left text-xs">
                  <thead className="bg-blue-50">
                    <tr>
                      {['Kho hàng', 'Tổng', 'Có thể bán', 'Đang giữ'].map((label) => (
                        <th scope="col" key={label} className="p-3">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.inventories.map((inventory) => (
                      <tr key={inventory.id} className="border-b border-slate-100">
                        <td className="p-3">
                          {inventory.warehouse.name}
                          <p className="mt-1 text-slate-500">
                            {inventory.warehouse.code} ·{' '}
                            {inventory.warehouse.address || 'Chưa có địa chỉ'}
                          </p>
                        </td>
                        <td className="p-3">{inventory.totalQty}</td>
                        <td className="p-3">{inventory.availableQty}</td>
                        <td className="p-3">{inventory.reservedQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Chưa có dữ liệu tồn kho.</p>
            )}
          </section>
        </div>
      )}
    </Popup>
  );
}

export function ProductActionDialog({
  product,
  kind,
  onClose,
  onSuccess,
}: {
  product: AdminProduct;
  kind: 'activate' | 'hide' | 'delete';
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const title =
    kind === 'delete' ? 'Xóa sản phẩm' : kind === 'hide' ? 'Ẩn sản phẩm' : 'Cho phép bán sản phẩm';
  const close = () => {
    if (!inFlight.current) onClose();
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (kind === 'hide' && !reason.trim()) {
      setError('Vui lòng nhập lý do ẩn sản phẩm.');
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      const result =
        kind === 'delete'
          ? await deleteAdminProduct(product.id)
          : await updateAdminProductStatus(product.id, {
              status: kind === 'hide' ? 'INACTIVE' : 'ACTIVE',
              reason: reason.trim() || undefined,
            });
      onSuccess(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể cập nhật sản phẩm.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  return (
    <Popup isOpen title={title} onClose={close} closeOnEsc={!pending} closeOnOverlay={!pending}>
      <form onSubmit={submit} className="space-y-4">
        <p className="break-words text-sm text-slate-600">
          {title}: <strong>{product.title}</strong>?
        </p>
        {kind === 'delete' ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Sản phẩm chưa có đơn hàng sẽ bị xóa vĩnh viễn. Nếu đã có lịch sử đơn hàng, hệ thống sẽ
            ẩn sản phẩm để giữ lại lịch sử giao dịch.
          </p>
        ) : (
          <label className="block text-sm font-medium">
            {kind === 'hide' ? 'Lý do ẩn sản phẩm' : 'Ghi chú (không bắt buộc)'}
            <textarea
              autoFocus
              required={kind === 'hide'}
              maxLength={500}
              rows={3}
              disabled={pending}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 p-3"
            />
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={pending} onClick={close}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant={kind === 'activate' ? 'primary' : 'danger'}
            disabled={pending}
          >
            {pending ? 'Đang xử lý…' : 'Xác nhận'}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
