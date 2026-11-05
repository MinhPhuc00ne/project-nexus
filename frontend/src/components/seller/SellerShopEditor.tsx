import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { Save as SaveOutlined } from 'lucide-react';
import {
  MapPin as EnvironmentOutlined,
  Upload as UploadOutlined,
  Store as ShopOutlined,
  Trash2 as DeleteOutlined,
} from 'lucide-react';
import type { SellerShopProfile } from '../../types/shop.types';
import { VIETNAM_PROVINCES } from '../../constants/vietnamProvinces';
import { updateSellerShopProfile, uploadShopAvatarFile } from '../../services/shops';
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
  const initialShopAvatar = profile.shopAvatarUrl ?? '';
  const [shopAvatarUrl, setShopAvatarUrl] = useState<string>(initialShopAvatar);
  const [shopAvatarFile, setShopAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const action = useSellerAction();
  const toast = useToast();

  useEffect(() => {
    if (!shopAvatarFile) {
      setAvatarPreview('');
      return;
    }
    const objectUrl = URL.createObjectURL(shopAvatarFile);
    setAvatarPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [shopAvatarFile]);

  const setField = (key: keyof typeof form, value: string): void =>
    setForm((current) => ({ ...current, [key]: value }));

  const displayedShopAvatar = avatarPreview || shopAvatarUrl;

  function submit(event: FormEvent): void {
    event.preventDefault();
    void action.run(
      async () => {
        if (profile.isShopSuspended)
          throw new Error('Gian hàng đang bị đình chỉ, chưa thể cập nhật thông tin.');

        let finalShopAvatar: string | null = shopAvatarUrl || null;

        if (section === 'store') {
          if (shopAvatarFile) {
            finalShopAvatar = await uploadShopAvatarFile(shopAvatarFile);
            setShopAvatarUrl(finalShopAvatar);
            setShopAvatarFile(null);
          }
        }

        const payload = shopFormPayload(form, initial, section);
        return updateSellerShopProfile({
          ...payload,
          ...(section === 'store' ? { shopAvatarUrl: finalShopAvatar } : {}),
        });
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
            {/* Ảnh đại diện riêng của Gian hàng (Shop Avatar) tách biệt với Avatar Seller */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs font-bold text-[#1c3973]">
                    Ảnh đại diện Gian hàng (Logo Shop)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ảnh đại diện của Shop hiển thị riêng biệt trên trang Gian hàng & Sản phẩm (không
                    dùng chung với ảnh cá nhân của chủ shop).
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-blue-200 bg-white text-2xl text-blue-600 shadow-xs">
                  {displayedShopAvatar ? (
                    <img
                      src={displayedShopAvatar}
                      alt={form.storeName || 'Logo gian hàng'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ShopOutlined />
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition">
                      <UploadOutlined /> Tải ảnh đại diện Shop
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          const selected = e.target.files?.[0];
                          e.target.value = '';
                          if (selected) setShopAvatarFile(selected);
                        }}
                      />
                    </label>
                    {(displayedShopAvatar || shopAvatarFile) && (
                      <button
                        type="button"
                        onClick={() => {
                          setShopAvatarFile(null);
                          setShopAvatarUrl('');
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                      >
                        <DeleteOutlined /> Gỡ logo shop
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Định dạng JPG, PNG hoặc WEBP (Tối đa 10 MB).
                  </p>
                </div>
              </div>
            </div>

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
            <p className="rounded-lg border border-blue-100 bg-blue-50 p-3.5 text-xs leading-6 text-blue-800">
              Email kinh doanh và Logo Shop là thông tin thương hiệu riêng của gian hàng. Thông tin
              cá nhân của chủ tài khoản được quản lý độc lập ở mục Tài khoản.
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
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
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
        <SellerButton
          secondary
          disabled={action.pending}
          onClick={() => {
            setForm(initial);
            setShopAvatarFile(null);
            setShopAvatarUrl(initialShopAvatar);
          }}
        >
          Hủy thay đổi
        </SellerButton>
        <SellerButton type="submit" disabled={action.pending || profile.isShopSuspended}>
          <SaveOutlined /> {action.pending ? 'Đang lưu…' : 'Lưu thay đổi'}
        </SellerButton>
      </div>
    </form>
  );
}
