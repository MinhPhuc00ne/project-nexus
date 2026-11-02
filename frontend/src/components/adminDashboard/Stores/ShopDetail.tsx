import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getAdminShopById } from '../../../services/admin';
import type { AdminShopDetail } from '../../../types/admin.types';
import Popup from '../../Popup';
import { Badge, Button } from '../shared/AdminUI';

const labels: Record<string, string> = {
  ACTIVE: 'Đang mở bán',
  SUSPENDED: 'Đang đình chỉ',
  INACTIVE: 'Ngừng hoạt động',
  DRAFT: 'Bản nháp',
  PENDING: 'Chờ xử lý',
  INVESTIGATING: 'Đang xác minh',
  CONFIRMED: 'Đã xác nhận',
  DISMISSED: 'Đã bác bỏ',
  WARN: 'Cảnh cáo',
  SUSPEND: 'Đình chỉ',
  RESTORE: 'Khôi phục',
  EXCELLENT: 'Rất tốt',
  GOOD: 'Tốt',
  STANDARD: 'Tiêu chuẩn',
  PROBATION: 'Đang theo dõi',
};
const date = (value: string) => new Date(value).toLocaleString('vi-VN');
const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm">{children || 'Chưa có thông tin'}</dd>
    </div>
  );
}

function evidenceLink(value: string) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function evidenceUrls(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export default function ShopDetail({ shopId, onClose }: { shopId: string; onClose: () => void }) {
  const { token } = useAuth();
  const [detail, setDetail] = useState<AdminShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setDetail(null);
    void getAdminShopById(shopId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDetail(result);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Không thể tải chi tiết cửa hàng.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [shopId, token, revision]);

  const shop = detail?.shop;
  const address = shop?.contact.address;

  return (
    <Popup
      isOpen
      onClose={onClose}
      title="Chi tiết cửa hàng"
      size="xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      {loading ? (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          Đang tải chi tiết cửa hàng…
        </p>
      ) : error ? (
        <div role="alert" className="space-y-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
            Thử lại
          </Button>
        </div>
      ) : (
        detail &&
        shop && (
          <div className="space-y-6">
            <div className="rounded-xl bg-blue-50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="break-words text-lg font-bold">{shop.storeName}</h3>
                <Badge
                  tone={
                    shop.status.currentStatus === 'ACTIVE'
                      ? 'green'
                      : shop.status.currentStatus === 'SUSPENDED'
                        ? 'red'
                        : 'gray'
                  }
                >
                  {labels[shop.status.currentStatus]}
                </Badge>
              </div>
              {shop.storeDescription && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">
                  {shop.storeDescription}
                </p>
              )}
              {shop.status.suspensionReason && (
                <p className="mt-2 break-words text-sm text-red-700">
                  Lý do đình chỉ: {shop.status.suspensionReason}
                </p>
              )}
            </div>
            <Section title="Thông tin cửa hàng">
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Chủ cửa hàng">{shop.owner.fullName}</Field>
                <Field label="Email chủ cửa hàng">{shop.owner.email}</Field>
                <Field label="Số điện thoại liên hệ">{shop.contact.phone}</Field>
                <Field label="Email kinh doanh">{shop.contact.businessEmail}</Field>
                <Field label="Ngày mở cửa hàng">{date(shop.openedAt)}</Field>
                <Field label="Giấy tờ định danh">{shop.contact.identityCardNumber}</Field>
                <Field label="Địa chỉ">
                  {address &&
                    (address.formattedAddress ||
                      [address.street, address.ward, address.district, address.city]
                        .filter(Boolean)
                        .join(', '))}
                </Field>
                <Field label="Uy tín / Mức tin cậy">
                  {shop.status.reputationScore} /{' '}
                  {labels[shop.status.trustLevel] || shop.status.trustLevel}
                </Field>
              </dl>
            </Section>
            <Section title="Sản phẩm">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {(
                  [
                    ['Tổng sản phẩm', detail.products.breakdown.total],
                    ['Đang hiển thị', detail.products.breakdown.active],
                    ['Hết hàng', detail.products.breakdown.outOfStock],
                    ['Đã ẩn', detail.products.breakdown.inactive],
                    ['Bản nháp', detail.products.breakdown.draft],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 text-lg font-bold">{value}</p>
                  </div>
                ))}
              </div>
              {detail.products.sampleList.length ? (
                <>
                  <p className="text-xs text-slate-500">
                    Hiển thị {detail.products.sampleList.length} sản phẩm mới nhất /{' '}
                    {detail.products.breakdown.total} sản phẩm.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-left text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          {['Sản phẩm', 'Danh mục', 'Giá', 'Tồn khả dụng / Tổng', 'Trạng thái'].map(
                            (title) => (
                              <th key={title} scope="col" className="p-3">
                                {title}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detail.products.sampleList.map((product) => (
                          <tr key={product.id}>
                            <td className="max-w-64 p-3">
                              <div className="flex items-center gap-2">
                                {product.thumbnail && (
                                  <img
                                    src={product.thumbnail}
                                    alt=""
                                    className="size-10 rounded object-cover"
                                    loading="lazy"
                                  />
                                )}
                                <span className="break-words font-medium">{product.title}</span>
                              </div>
                            </td>
                            <td className="p-3">{product.category?.name || 'Chưa phân loại'}</td>
                            <td className="p-3">{money(product.basePrice)}</td>
                            <td className="p-3">
                              {product.availableQty} / {product.totalQty}
                            </td>
                            <td className="p-3">
                              <Badge
                                tone={
                                  product.status === 'ACTIVE'
                                    ? product.isOutOfStock
                                      ? 'amber'
                                      : 'green'
                                    : 'gray'
                                }
                              >
                                {product.status === 'ACTIVE'
                                  ? product.isOutOfStock
                                    ? 'Hết hàng'
                                    : 'Đang hiển thị'
                                  : product.status === 'INACTIVE'
                                    ? 'Đã ẩn'
                                    : labels[product.status] || product.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">Cửa hàng chưa có sản phẩm.</p>
              )}
            </Section>
            <Section title="Vi phạm và báo cáo">
              <p className="text-xs text-slate-500">
                Tổng: {detail.violations.summary.total} · Chờ xử lý / xác minh:{' '}
                {detail.violations.summary.pending} · Đã xác nhận:{' '}
                {detail.violations.summary.confirmed}
              </p>
              {detail.violations.items.length ? (
                detail.violations.items.map((item) => (
                  <article
                    key={item.id}
                    className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="break-words font-semibold">{item.title}</h4>
                      <Badge
                        tone={
                          item.status === 'CONFIRMED'
                            ? 'red'
                            : item.status === 'DISMISSED'
                              ? 'gray'
                              : 'amber'
                        }
                      >
                        {labels[item.status] || item.status}
                      </Badge>
                    </div>
                    <p className="whitespace-pre-wrap break-words">{item.description}</p>
                    <p className="text-xs text-slate-500">
                      {date(item.createdAt)} · Người báo cáo:{' '}
                      {item.reporter?.fullName || 'Không có thông tin'}
                    </p>
                    {item.penaltyLevel && <p>Mức xử lý: {item.penaltyLevel}</p>}
                    {item.resolutionNotes && (
                      <p className="whitespace-pre-wrap break-words">
                        Kết quả xử lý: {item.resolutionNotes}
                      </p>
                    )}
                    {item.handledBy && (
                      <p className="text-xs text-slate-500">
                        Xử lý bởi: {item.handledBy.fullName}
                        {item.handledAt && ` · ${date(item.handledAt)}`}
                      </p>
                    )}
                    {!!evidenceUrls(item.evidenceUrls).length && (
                      <div className="flex flex-wrap gap-3">
                        {evidenceUrls(item.evidenceUrls).map((url, index) => {
                          const href = evidenceLink(url);
                          return href ? (
                            <a
                              key={`${url}-${index}`}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-700 underline"
                            >
                              Bằng chứng {index + 1}
                            </a>
                          ) : null;
                        })}
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <p className="text-sm text-slate-500">Chưa có vi phạm hoặc báo cáo.</p>
              )}
            </Section>
            <Section title="Lịch sử quản trị">
              {detail.moderationHistory.length ? (
                <ul className="space-y-3">
                  {detail.moderationHistory.map((log) => (
                    <li key={log.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          tone={
                            log.action === 'SUSPEND'
                              ? 'red'
                              : log.action === 'RESTORE'
                                ? 'green'
                                : 'amber'
                          }
                        >
                          {labels[log.action] || log.action}
                        </Badge>
                        <span>{log.admin.fullName}</span>
                        <span className="text-xs text-slate-500">{date(log.createdAt)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-slate-600">
                        {log.reason || 'Không có ghi chú'}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Chưa có lịch sử quản trị.</p>
              )}
            </Section>
          </div>
        )
      )}
    </Popup>
  );
}
