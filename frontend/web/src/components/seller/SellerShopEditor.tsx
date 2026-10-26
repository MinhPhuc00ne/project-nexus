import { useState, type FormEvent, type ReactElement } from 'react';
import { SaveOutlined, EnvironmentOutlined } from '@ant-design/icons';
import type { SellerShopProfile } from '../../types/shop.types';
import { VIETNAM_PROVINCES } from '../../constants/vietnamProvinces';
import { updateSellerShopProfile } from '../../services/shops';
import { useToast } from '../ToastNotification';
import { SellerButton } from './SellerUI';
import useSellerAction from './useSellerAction';
import { sellerInputClass, sellerLabelClass } from './SellerResourceState';
import { shopFormFromProfile, shopFormPayload } from './sellerShopForm';

export default function SellerShopEditor({
  profile,
  section,
  onSaved,
}: {
  profile: SellerShopProfile;
  section: 'store' | 'shipping';
  onSaved: () => void;
}): ReactElement {
  const initial = shopFormFromProfile(profile);
  const [form, setForm] = useState(initial);
  const action = useSellerAction();
  const toast = useToast();
  const setField = (key: keyof typeof form, value: string): void =>
    setForm((current) => ({ ...current, [key]: value }));
  function submit(event: FormEvent): void {
    event.preventDefault();
    void action.run(
      () => {
        if (profile.isShopSuspended)
          throw new Error('Gian hàng đang bị đình chỉ, chưa thể cập nhật thông tin.');
        return updateSellerShopProfile(shopFormPayload(form, initial, section));
      },
      (result) => {
        toast.success(result.message);
        onSaved();
      },
    );
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      {profile.isShopSuspended && (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          Gian hàng đang bị đình chỉ.
          {profile.suspensionReason ? ` Lý do: ${profile.suspensionReason}` : ''}
        </p>
      )}
      <fieldset
        disabled={action.pending || profile.isShopSuspended}
        className="space-y-5 disabled:opacity-60"
      >
        {section === 'store' ? (
          <>
            <label className={sellerLabelClass}>
              Tên gian hàng
              <input
                className={sellerInputClass}
                required
                maxLength={160}
                value={form.storeName}
                onChange={(e) => setField('storeName', e.target.value)}
              />
            </label>
            <label className={sellerLabelClass}>
              Giới thiệu gian hàng
              <textarea
                className={sellerInputClass}
                rows={5}
                maxLength={3000}
                value={form.storeDescription}
                onChange={(e) => setField('storeDescription', e.target.value)}
                placeholder="Giới thiệu thương hiệu và sản phẩm của bạn"
              />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className={sellerLabelClass}>
                Số điện thoại liên hệ
                <input
                  className={sellerInputClass}
                  required
                  type="tel"
                  maxLength={20}
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                />
              </label>
              <label className={sellerLabelClass}>
                Email kinh doanh
                <input
                  className={sellerInputClass}
                  type="email"
                  maxLength={254}
                  value={form.businessEmail}
                  onChange={(e) => setField('businessEmail', e.target.value)}
                />
              </label>
            </div>
            <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-800">
              Email kinh doanh là thông tin liên hệ của shop. Email đăng nhập được quản lý trong hồ
              sơ cá nhân.
            </p>
          </>
        ) : (
          <>
            <label className={sellerLabelClass}>
              Số nhà, tên đường
              <input
                className={sellerInputClass}
                required
                maxLength={300}
                value={form.street}
                onChange={(e) => setField('street', e.target.value)}
                placeholder="Nhập địa chỉ cụ thể của shop / kho"
              />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className={sellerLabelClass}>
                Phường / xã
                <input
                  className={sellerInputClass}
                  maxLength={150}
                  value={form.ward}
                  onChange={(e) => setField('ward', e.target.value)}
                />
              </label>
              <label className={sellerLabelClass}>
                Quận / huyện
                <input
                  className={sellerInputClass}
                  maxLength={150}
                  value={form.district}
                  onChange={(e) => setField('district', e.target.value)}
                />
              </label>
            </div>
            <label className={sellerLabelClass}>
              Tỉnh / thành phố
              <select
                className={sellerInputClass}
                required
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
              >
                <option value="">Chọn tỉnh / thành phố</option>
                {form.city && !VIETNAM_PROVINCES.includes(form.city) && (
                  <option value={form.city}>{form.city} (đã lưu)</option>
                )}
                {VIETNAM_PROVINCES.map((city) => (
                  <option value={city} key={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <p className="mb-4 flex items-center gap-2 text-xs font-medium text-blue-800">
                <EnvironmentOutlined /> Vị trí dùng tính khoảng cách vận chuyển
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={sellerLabelClass}>
                  Vĩ độ
                  <input
                    className={sellerInputClass}
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    value={form.latitude}
                    onChange={(e) => setField('latitude', e.target.value)}
                    placeholder="Ví dụ: 10.795"
                  />
                </label>
                <label className={sellerLabelClass}>
                  Kinh độ
                  <input
                    className={sellerInputClass}
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    value={form.longitude}
                    onChange={(e) => setField('longitude', e.target.value)}
                    placeholder="Ví dụ: 106.721"
                  />
                </label>
              </div>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                Kiểm tra lại tọa độ khi thay đổi địa chỉ để cước vận chuyển được tính chính xác.
              </p>
            </div>
          </>
        )}
      </fieldset>
      {action.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {action.error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        <SellerButton secondary disabled={action.pending} onClick={() => setForm(initial)}>
          Hủy thay đổi
        </SellerButton>
        <SellerButton type="submit" disabled={action.pending || profile.isShopSuspended}>
          <SaveOutlined /> {action.pending ? 'Đang lưu…' : 'Lưu thay đổi'}
        </SellerButton>
      </div>
    </form>
  );
}
