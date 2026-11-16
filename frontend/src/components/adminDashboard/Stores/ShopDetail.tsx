import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  createAdminShopViolation,
  getAdminShopActionLogs,
  getAdminShopById,
  getAdminShopViolations,
  resolveAdminShopAppeal,
} from '../../../services/admin';
import type { AdminShopDetail } from '../../../types/admin.types';
import Popup from '../../Popup';
import { Badge, Button } from '../shared/AdminUI';
import { useToast } from '../../ToastNotification';
import ShopOrdersPanel from './ShopOrdersPanel';

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

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {action}
      </div>
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

export default function ShopDetail({
  shopId,
  onClose,
  onMutation,
}: {
  shopId: string;
  onClose: () => void;
  onMutation?: () => void;
}) {
  const { token } = useAuth();
  const toast = useToast();
  const [detail, setDetail] = useState<AdminShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [violationOpen, setViolationOpen] = useState(false);
  const [appealOpen, setAppealOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setDetail(null);
    void Promise.all([
      getAdminShopById(shopId, controller.signal),
      getAdminShopViolations(shopId, controller.signal),
      getAdminShopActionLogs(shopId, controller.signal),
    ])
      .then(([result, violations, actionLogs]) => {
        if (controller.signal.aborted) return;
        const pending = violations.items.filter(
          (item) => item.status === 'PENDING' || item.status === 'INVESTIGATING',
        ).length;
        const confirmed = violations.items.filter((item) => item.status === 'CONFIRMED').length;
        setDetail({
          ...result,
          violations: {
            summary: { total: violations.total, pending, confirmed },
            items: violations.items,
          },
          moderationHistory: actionLogs.items,
        });
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
  const handleMutationSuccess = (message: string) => {
    toast.success(message);
    setRevision((value) => value + 1);
    onMutation?.();
  };

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
                {shop.status.isShopSuspended && (
                  <Button variant="primary" onClick={() => setAppealOpen(true)}>
                    Khôi phục theo kháng nghị
                  </Button>
                )}
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
            <ShopOrdersPanel shopId={shopId} />
            <Section
              title="Vi phạm và báo cáo"
              action={
                <Button variant="secondary" onClick={() => setViolationOpen(true)}>
                  Ghi nhận vi phạm
                </Button>
              }
            >
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
            {violationOpen && (
              <CreateShopViolationDialog
                shopName={shop.storeName}
                shopId={shop.id}
                onClose={() => setViolationOpen(false)}
                onSuccess={(message) => {
                  setViolationOpen(false);
                  handleMutationSuccess(message);
                }}
              />
            )}
            {appealOpen && (
              <ResolveShopAppealDialog
                shopName={shop.storeName}
                shopId={shop.id}
                onClose={() => setAppealOpen(false)}
                onSuccess={(message) => {
                  setAppealOpen(false);
                  handleMutationSuccess(message);
                }}
              />
            )}
          </div>
        )
      )}
    </Popup>
  );
}

function CreateShopViolationDialog({
  shopId,
  shopName,
  onClose,
  onSuccess,
}: {
  shopId: string;
  shopName: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [penaltyLevel, setPenaltyLevel] = useState('WARNING');
  const [status, setStatus] = useState<'PENDING' | 'INVESTIGATING' | 'CONFIRMED' | 'DISMISSED'>(
    'CONFIRMED',
  );
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlightRef = useRef(false);

  const close = () => {
    if (!inFlightRef.current) onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setPending(true);
    setError('');

    try {
      const result = await createAdminShopViolation(shopId, {
        title: title.trim(),
        description: description.trim(),
        evidenceUrls: evidenceText
          .split(/\r?\n/)
          .map((url) => url.trim())
          .filter(Boolean),
        penaltyLevel,
        status,
        ...(resolutionNotes.trim() ? { resolutionNotes: resolutionNotes.trim() } : {}),
      });
      onSuccess(result.message);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Không ghi nhận được vi phạm shop.');
    } finally {
      inFlightRef.current = false;
      setPending(false);
    }
  };

  return (
    <Popup
      isOpen
      title="Ghi nhận vi phạm shop"
      onClose={close}
      closeOnEsc={!pending}
      closeOnOverlay={!pending}
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">
          Ghi nhận hồ sơ vi phạm cho <strong>{shopName}</strong>.
        </p>
        <label className="block text-sm font-medium">
          Tiêu đề vi phạm
          <input
            required
            maxLength={200}
            value={title}
            disabled={pending}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3"
          />
        </label>
        <label className="block text-sm font-medium">
          Mô tả
          <textarea
            required
            maxLength={5000}
            rows={4}
            value={description}
            disabled={pending}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3"
          />
        </label>
        <label className="block text-sm font-medium">
          Link bằng chứng (mỗi dòng một link)
          <textarea
            rows={2}
            value={evidenceText}
            disabled={pending}
            onChange={(event) => setEvidenceText(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3"
            placeholder="https://..."
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Mức xử lý
            <select
              value={penaltyLevel}
              disabled={pending}
              onChange={(event) => setPenaltyLevel(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3"
            >
              <option value="WARNING">Cảnh cáo</option>
              <option value="PENALTY_POINTS">Trừ điểm uy tín</option>
              <option value="TEMPORARY_SUSPENSION">Đình chỉ tạm thời</option>
              <option value="PERMANENT_BAN">Cấm vĩnh viễn</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Trạng thái hồ sơ
            <select
              value={status}
              disabled={pending}
              onChange={(event) =>
                setStatus(
                  event.target.value as 'PENDING' | 'INVESTIGATING' | 'CONFIRMED' | 'DISMISSED',
                )
              }
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3"
            >
              <option value="PENDING">Chờ xử lý</option>
              <option value="INVESTIGATING">Đang xác minh</option>
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="DISMISSED">Đã bác bỏ</option>
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium">
          Ghi chú xử lý (không bắt buộc)
          <textarea
            rows={2}
            value={resolutionNotes}
            disabled={pending}
            onChange={(event) => setResolutionNotes(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close} disabled={pending}>
            Hủy
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? 'Đang lưu…' : 'Ghi nhận vi phạm'}
          </Button>
        </div>
      </form>
    </Popup>
  );
}

function ResolveShopAppealDialog({
  shopId,
  shopName,
  onClose,
  onSuccess,
}: {
  shopId: string;
  shopName: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [restoredScore, setRestoredScore] = useState('100');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlightRef = useRef(false);

  const close = () => {
    if (!inFlightRef.current) onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlightRef.current) return;
    const score = Number(restoredScore);
    if (!Number.isInteger(score) || score < 50 || score > 2147483647) {
      setError('Điểm uy tín phải là số nguyên từ 50 trở lên.');
      return;
    }

    inFlightRef.current = true;
    setPending(true);
    setError('');
    try {
      const result = await resolveAdminShopAppeal(shopId, {
        reason: reason.trim(),
        restoredScore: score,
      });
      onSuccess(result.message);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Không xử lý được kháng nghị shop.');
    } finally {
      inFlightRef.current = false;
      setPending(false);
    }
  };

  return (
    <Popup
      isOpen
      title="Chấp nhận kháng nghị shop"
      onClose={close}
      closeOnEsc={!pending}
      closeOnOverlay={!pending}
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">
          Thao tác này mở lại hoạt động bán và kích hoạt lại sản phẩm INACTIVE của{' '}
          <strong>{shopName}</strong>.
        </p>
        <label className="block text-sm font-medium">
          Lý do chấp nhận
          <textarea
            required
            maxLength={1000}
            rows={4}
            value={reason}
            disabled={pending}
            onChange={(event) => setReason(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3"
          />
        </label>
        <label className="block text-sm font-medium">
          Điểm uy tín khôi phục
          <input
            required
            type="number"
            min={50}
            max={2147483647}
            step={1}
            value={restoredScore}
            disabled={pending}
            onChange={(event) => setRestoredScore(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close} disabled={pending}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? 'Đang khôi phục…' : 'Chấp nhận & khôi phục shop'}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
