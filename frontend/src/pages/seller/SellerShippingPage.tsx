import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { ArrowLeft as ArrowLeftOutlined } from 'lucide-react';
import { Calculator as CalculatorOutlined, MapPin as EnvironmentOutlined } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ToastNotification';
import { useSellerSession } from '../../components/seller/SellerSession';
import useProductResource from '../../components/productDetail/useProductResource';
import GhnLocationPicker, { emptyGhnLocation } from '../../components/seller/GhnLocationPicker';
import SellerShippingResult from '../../components/seller/SellerShippingResult';
import { PageHeading, Panel, SellerButton, SellerLink } from '../../components/seller/SellerUI';
import { getMyProducts } from '../../services/sellerProducts';
import { getStoredToken } from '../../services/auth';
import {
  getShippingDistance,
  getShippingQuote,
  getShippingServices,
  parseCoordinate,
} from '../../services/shipping';
import type {
  GhnLocation,
  GhnService,
  ShippingQuote,
  DistanceResult,
} from '../../types/shipping.types';

const inputClass = 'mt-2 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm';
export default function SellerShippingPage(): ReactElement {
  const user = useSellerSession();
  const { token } = useAuth();
  return <ShippingCalculator key={`${user.id}:${token}`} />;
}
function ShippingCalculator(): ReactElement {
  const user = useSellerSession();
  const { token } = useAuth();
  const toast = useToast();
  const products = useProductResource(getMyProducts);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [from, setFrom] = useState<GhnLocation>({ ...emptyGhnLocation });
  const [to, setTo] = useState<GhnLocation>({ ...emptyGhnLocation });
  const [coords, setCoords] = useState({ originLat: '', originLon: '', destLat: '', destLon: '' });
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [distance, setDistance] = useState<DistanceResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const servicesLoader = useCallback(
    () =>
      from.districtId && to.districtId
        ? getShippingServices(Number(from.districtId), Number(to.districtId))
        : Promise.resolve<GhnService[]>([]),
    [from.districtId, to.districtId],
  );
  const services = useProductResource(servicesLoader);
  const product = products.data?.find((item) => item.id === productId);
  function invalidate(): void {
    setQuote(null);
    setDistance(null);
    setError('');
  }
  async function calculate(mode: 'quote' | 'distance'): Promise<void> {
    if (lock.current) return;
    invalidate();
    try {
      if (!product) throw new Error('Chọn sản phẩm của gian hàng để tính khối lượng vận chuyển.');
      const qty = Number(quantity);
      if (!Number.isSafeInteger(qty) || qty < 1 || qty > 2147483647)
        throw new Error('Số lượng phải là số nguyên dương hợp lệ.');
      const destLat = parseCoordinate(coords.destLat, true);
      const destLon = parseCoordinate(coords.destLon, false);
      const hasOrigin = Boolean(coords.originLat.trim() || coords.originLon.trim());
      const origin = hasOrigin
        ? {
            originLat: parseCoordinate(coords.originLat, true),
            originLon: parseCoordinate(coords.originLon, false),
          }
        : null;
      if (mode === 'distance' && !origin)
        throw new Error('Nhập tọa độ điểm gửi để đo khoảng cách trực tiếp.');
      lock.current = true;
      setPending(true);
      if (mode === 'distance' && origin) {
        const result = await getShippingDistance({
          ...origin,
          destLat,
          destLon,
          weightGrams: product.weightGrams * qty,
        });
        if (active.current && token === getStoredToken()) setDistance(result);
      } else {
        const result = await getShippingQuote({
          sellerId: user.id,
          destLatitude: destLat,
          destLongitude: destLon,
          ...(origin && { originLatitude: origin.originLat, originLongitude: origin.originLon }),
          ...(from.districtId && { fromDistrictId: Number(from.districtId) }),
          ...(from.wardCode && { fromWardCode: from.wardCode }),
          ...(to.districtId && { toDistrictId: Number(to.districtId) }),
          ...(to.wardCode && { toWardCode: to.wardCode }),
          items: [
            {
              productId: product.id,
              quantity: qty,
              weightGrams: product.weightGrams,
              lengthCm: product.lengthCm,
              widthCm: product.widthCm,
              heightCm: product.heightCm,
            },
          ],
        });
        if (active.current && token === getStoredToken()) setQuote(result);
      }
    } catch (cause) {
      if (active.current && token === getStoredToken()) {
        const message = cause instanceof Error ? cause.message : 'Không thể tính phí vận chuyển.';
        setError(message);
        toast.error(message);
      }
    } finally {
      lock.current = false;
      if (active.current) setPending(false);
    }
  }
  return (
    <div className="space-y-6">
      <PageHeading
        title="Tra cứu phí vận chuyển"
        description="Tính cước dự kiến cho sản phẩm của gian hàng theo địa điểm gửi và nhận."
        actions={
          <SellerLink to="/seller/orders" secondary>
            <ArrowLeftOutlined /> Đơn hàng & GHN
          </SellerLink>
        }
      />
      <Panel title="Thông tin kiện hàng" subtitle="Tra cứu cước không tạo đơn hàng hay vận đơn.">
        <fieldset disabled={pending} className="space-y-5 text-sm disabled:opacity-70">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              Sản phẩm
              <select
                value={productId}
                className={inputClass}
                disabled={products.loading || !!products.error}
                onChange={(event) => {
                  setProductId(event.target.value);
                  invalidate();
                }}
              >
                <option value="">
                  {products.loading ? 'Đang tải sản phẩm…' : 'Chọn sản phẩm'}
                </option>
                {products.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Số lượng
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                className={inputClass}
                onChange={(event) => {
                  setQuantity(event.target.value);
                  invalidate();
                }}
              />
            </label>
          </div>
          {(products.error || (!products.loading && !products.data?.length)) && (
            <p role="alert" className="text-amber-700">
              {products.error || 'Chưa có sản phẩm để tính phí.'}{' '}
              <button type="button" className="text-blue-700 underline" onClick={products.retry}>
                Tải lại
              </button>
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <GhnLocationPicker
              label="Địa phương gửi hàng"
              value={from}
              onChange={(value) => {
                setFrom(value);
                invalidate();
              }}
            />
            <GhnLocationPicker
              label="Địa phương nhận hàng"
              value={to}
              onChange={(value) => {
                setTo(value);
                invalidate();
              }}
            />
          </div>
          <p className="text-xs text-slate-500">
            Để đối soát giá GHN, chọn quận gửi, quận nhận và phường nhận. Tọa độ bên dưới dùng để
            tính quãng đường; chọn địa phương không tự xác định tọa độ.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ['originLat', 'Vĩ độ điểm gửi'],
                ['originLon', 'Kinh độ điểm gửi'],
                ['destLat', 'Vĩ độ điểm nhận'],
                ['destLon', 'Kinh độ điểm nhận'],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  step="any"
                  min={key.endsWith('Lat') ? -90 : -180}
                  max={key.endsWith('Lat') ? 90 : 180}
                  value={coords[key]}
                  className={inputClass}
                  onChange={(event) => {
                    setCoords({ ...coords, [key]: event.target.value });
                    invalidate();
                  }}
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Báo giá: bỏ trống tọa độ gửi để hệ thống dùng vị trí gian hàng hoặc kho mặc định. Đo
            khoảng cách trực tiếp: nhập đủ tọa độ gửi và nhận.
          </p>
          <div className="flex flex-wrap gap-3">
            <SellerButton disabled={pending || !product} onClick={() => void calculate('quote')}>
              <CalculatorOutlined /> {pending ? 'Đang tính…' : 'Tính phí vận chuyển'}
            </SellerButton>
            <SellerButton
              secondary
              disabled={pending || !product}
              onClick={() => void calculate('distance')}
            >
              <EnvironmentOutlined /> Đo khoảng cách
            </SellerButton>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </Panel>
      {from.districtId && to.districtId && (
        <Panel
          title="Dịch vụ GHN khả dụng"
          action={
            <SellerButton secondary disabled={services.loading} onClick={services.retry}>
              Làm mới
            </SellerButton>
          }
        >
          <div className="text-sm text-slate-600">
            {services.loading ? (
              <p role="status">Đang tra cứu…</p>
            ) : services.error ? (
              <p role="alert">{services.error}</p>
            ) : services.data?.length ? (
              <ul className="space-y-2">
                {services.data.map((item) => (
                  <li key={item.serviceId}>{item.shortName}</li>
                ))}
              </ul>
            ) : (
              <p>GHN chưa trả về dịch vụ cho tuyến này. Chưa xác nhận được khả năng giao hàng.</p>
            )}
          </div>
        </Panel>
      )}
      <SellerShippingResult quote={quote} distance={distance} />
    </div>
  );
}
