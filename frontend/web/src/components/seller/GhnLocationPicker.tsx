import { useCallback, type ReactElement } from 'react';
import useProductResource from '../productDetail/useProductResource';
import {
  getShippingDistricts,
  getShippingProvinces,
  getShippingWards,
} from '../../services/shipping';
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
        Tỉnh / thành phố
        <select
          aria-label={`${label}: Tỉnh / thành phố`}
          className={selectClass}
          value={value.provinceId}
          disabled={provinces.loading || !!provinces.error}
          onChange={(event) =>
            onChange({ provinceId: event.target.value, districtId: '', wardCode: '' })
          }
        >
          <option value="">{provinces.loading ? 'Đang tải…' : 'Chọn tỉnh / thành phố'}</option>
          {provinces.data?.map((item) => (
            <option key={item.provinceId} value={item.provinceId}>
              {item.provinceName}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        Quận / huyện
        <select
          aria-label={`${label}: Quận / huyện`}
          className={selectClass}
          value={value.districtId}
          disabled={!value.provinceId || districts.loading || !!districts.error}
          onChange={(event) => onChange({ ...value, districtId: event.target.value, wardCode: '' })}
        >
          <option value="">
            {districts.loading && value.provinceId ? 'Đang tải…' : 'Chọn quận / huyện'}
          </option>
          {districts.data?.map((item) => (
            <option key={item.districtId} value={item.districtId}>
              {item.districtName}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        Phường / xã
        <select
          aria-label={`${label}: Phường / xã`}
          className={selectClass}
          value={value.wardCode}
          disabled={!value.districtId || wards.loading || !!wards.error}
          onChange={(event) => onChange({ ...value, wardCode: event.target.value })}
        >
          <option value="">
            {wards.loading && value.districtId ? 'Đang tải…' : 'Chọn phường / xã'}
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
          GHN chưa trả về quận / huyện cho tỉnh đã chọn.
        </p>
      )}
      {!error && !wards.loading && value.districtId && !wards.data?.length && (
        <p role="status" className="text-xs text-amber-700">
          GHN chưa trả về phường / xã cho quận đã chọn.
        </p>
      )}
      {(error || (!provinces.loading && !provinces.data?.length)) && (
        <div role="alert" className="text-xs text-amber-700">
          <p>{error || 'GHN chưa trả về danh sách địa phương. Chưa thể đối soát cước GHN.'}</p>
          <button
            type="button"
            className="mt-2 text-blue-700 underline"
            onClick={() => {
              provinces.retry();
              districts.retry();
              wards.retry();
            }}
          >
            Tải lại địa phương
          </button>
        </div>
      )}
    </fieldset>
  );
}
