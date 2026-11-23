import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { ArrowLeft as ArrowLeftOutlined } from 'lucide-react';
import { Calculator as CalculatorOutlined, MapPin as EnvironmentOutlined } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ToastNotification';
import { useSellerSession } from '../../components/seller/SellerSession';
import useProductResource from '../../components/productDetail/useProductResource';
import GhnLocationPicker, { emptyGhnLocation } from '../../components/seller/GhnLocationPicker';
import SellerShippingResult from '../../components/seller/SellerShippingResult';
import SellerPickupPointPanel from '../../components/seller/SellerPickupPointPanel';
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
  const { t } = useTranslation('seller');
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
      if (!product) throw new Error(t('shipping.selectProductErr'));
      const qty = Number(quantity);
      if (!Number.isSafeInteger(qty) || qty < 1 || qty > 2147483647)
        throw new Error(t('shipping.invalidQtyErr'));
      const destLat = parseCoordinate(coords.destLat, true);
      const destLon = parseCoordinate(coords.destLon, false);
      const hasOrigin = Boolean(coords.originLat.trim() || coords.originLon.trim());
      const origin = hasOrigin
        ? {
            originLat: parseCoordinate(coords.originLat, true),
            originLon: parseCoordinate(coords.originLon, false),
          }
        : null;
      if (mode === 'distance' && !origin) throw new Error(t('shipping.missingOriginErr'));
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
        const message = cause instanceof Error ? cause.message : t('shipping.calcFailed');
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
        title={t('shipping.pageTitle')}
        description={t('shipping.pageDesc')}
        actions={
          <SellerLink to="/seller/orders" secondary>
            <ArrowLeftOutlined /> {t('shipping.backToOrders')}
          </SellerLink>
        }
      />
      <Panel title={t('shipping.panelTitle')} subtitle={t('shipping.panelSubtitle')}>
        <fieldset disabled={pending} className="space-y-5 text-sm disabled:opacity-70">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              {t('shipping.productLabel')}
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
                  {products.loading ? t('shipping.loadingProducts') : t('shipping.selectProduct')}
                </option>
                {products.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('shipping.quantityLabel')}
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
              {products.error || t('shipping.noProducts')}{' '}
              <button type="button" className="text-blue-700 underline" onClick={products.retry}>
                {t('shipping.reload')}
              </button>
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <GhnLocationPicker
              label={t('shipping.fromLocation')}
              value={from}
              onChange={(value) => {
                setFrom(value);
                invalidate();
              }}
            />
            <GhnLocationPicker
              label={t('shipping.toLocation')}
              value={to}
              onChange={(value) => {
                setTo(value);
                invalidate();
              }}
            />
          </div>
          <p className="text-xs text-slate-500">{t('shipping.ghnHint')}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ['originLat', t('shipping.originLat')],
                ['originLon', t('shipping.originLon')],
                ['destLat', t('shipping.destLat')],
                ['destLon', t('shipping.destLon')],
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
          <p className="text-xs text-slate-500">{t('shipping.coordsHint')}</p>
          <div className="flex flex-wrap gap-3">
            <SellerButton disabled={pending || !product} onClick={() => void calculate('quote')}>
              <CalculatorOutlined /> {pending ? t('shipping.calculating') : t('shipping.calcQuote')}
            </SellerButton>
            <SellerButton
              secondary
              disabled={pending || !product}
              onClick={() => void calculate('distance')}
            >
              <EnvironmentOutlined /> {t('shipping.measureDistance')}
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
          title={t('shipping.availableServices')}
          action={
            <SellerButton secondary disabled={services.loading} onClick={services.retry}>
              {t('shipping.refresh')}
            </SellerButton>
          }
        >
          <div className="text-sm text-slate-600">
            {services.loading ? (
              <p role="status">{t('shipping.lookingUp')}</p>
            ) : services.error ? (
              <p role="alert">{services.error}</p>
            ) : services.data?.length ? (
              <ul className="space-y-2">
                {services.data.map((item) => (
                  <li key={item.serviceId}>{item.shortName}</li>
                ))}
              </ul>
            ) : (
              <p>{t('shipping.noServices')}</p>
            )}
          </div>
        </Panel>
      )}
      <SellerPickupPointPanel />
      <SellerShippingResult quote={quote} distance={distance} />
    </div>
  );
}
