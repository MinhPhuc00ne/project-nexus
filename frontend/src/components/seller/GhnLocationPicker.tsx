import { useCallback, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useProductResource from '../productDetail/useProductResource';
import {
  getShippingDistricts,
  getShippingProvinces,
  getShippingWards,
} from '@/features/shipping/services/shipping';
import type { GhnDistrict, GhnLocation, GhnWard } from '../../types/shipping.types';

export const emptyGhnLocation: GhnLocation = { provinceId: '', districtId: '', wardCode: '' };
export default function GhnLocationPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: GhnLocation;
  onChange: (value: GhnLocation) => void;
}): ReactElement {
  const { t } = useTranslation('seller');
  const provinces = useProductResource(getShippingProvinces);
  const districtLoader = useCallback(
    () =>
      value.provinceId
        ? getShippingDistricts(Number(value.provinceId))
        : Promise.resolve<GhnDistrict[]>([]),
    [value.provinceId],
  );
  const wardLoader = useCallback(
    () =>
      value.districtId
        ? getShippingWards(Number(value.districtId))
        : Promise.resolve<GhnWard[]>([]),
    [value.districtId],
  );
  const districts = useProductResource(districtLoader);
  const wards = useProductResource(wardLoader);
  const error = provinces.error || districts.error || wards.error;
  const selectClass =
    'mt-2 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm disabled:bg-slate-50';
  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
      <legend className="px-2 font-semibold">{label}</legend>
      <label className="block">
        {t('shipping.locationPicker.province')}
        <select
          aria-label={`${label}: ${t('shipping.locationPicker.province')}`}
          className={selectClass}
          value={value.provinceId}
          disabled={provinces.loading || !!provinces.error}
          onChange={(event) =>
            onChange({ provinceId: event.target.value, districtId: '', wardCode: '' })
          }
        >
          <option value="">
            {provinces.loading
              ? t('shipping.locationPicker.loading')
              : t('shipping.locationPicker.selectProvince')}
          </option>
          {provinces.data?.map((item) => (
            <option key={item.provinceId} value={item.provinceId}>
              {item.provinceName}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        {t('shipping.locationPicker.district')}
        <select
          aria-label={`${label}: ${t('shipping.locationPicker.district')}`}
          className={selectClass}
          value={value.districtId}
          disabled={!value.provinceId || districts.loading || !!districts.error}
          onChange={(event) => onChange({ ...value, districtId: event.target.value, wardCode: '' })}
        >
          <option value="">
            {districts.loading && value.provinceId
              ? t('shipping.locationPicker.loading')
              : t('shipping.locationPicker.selectDistrict')}
          </option>
          {districts.data?.map((item) => (
            <option key={item.districtId} value={item.districtId}>
              {item.districtName}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        {t('shipping.locationPicker.ward')}
        <select
          aria-label={`${label}: ${t('shipping.locationPicker.ward')}`}
          className={selectClass}
          value={value.wardCode}
          disabled={!value.districtId || wards.loading || !!wards.error}
          onChange={(event) => onChange({ ...value, wardCode: event.target.value })}
        >
          <option value="">
            {wards.loading && value.districtId
              ? t('shipping.locationPicker.loading')
              : t('shipping.locationPicker.selectWard')}
          </option>
          {wards.data?.map((item) => (
            <option key={item.wardCode} value={item.wardCode}>
              {item.wardName}
            </option>
          ))}
        </select>
      </label>
      {!error && !districts.loading && value.provinceId && !districts.data?.length && (
        <p role="status" className="text-xs text-amber-700">
          {t('shipping.locationPicker.noDistricts')}
        </p>
      )}
      {!error && !wards.loading && value.districtId && !wards.data?.length && (
        <p role="status" className="text-xs text-amber-700">
          {t('shipping.locationPicker.noWards')}
        </p>
      )}
      {(error || (!provinces.loading && !provinces.data?.length)) && (
        <div role="alert" className="text-xs text-amber-700">
          <p>{error || t('shipping.locationPicker.noProvinces')}</p>
          <button
            type="button"
            className="mt-2 text-blue-700 underline"
            onClick={() => {
              provinces.retry();
              districts.retry();
              wards.retry();
            }}
          >
            {t('shipping.locationPicker.reloadLocations')}
          </button>
        </div>
      )}
    </fieldset>
  );
}
