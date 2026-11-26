import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { Save as SaveOutlined } from 'lucide-react';
import {
  MapPin as EnvironmentOutlined,
  Upload as UploadOutlined,
  Store as ShopOutlined,
  Trash2 as DeleteOutlined,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SellerShopProfile } from '@/features/catalog/types/shop.types';
import { VIETNAM_PROVINCES } from '../../constants/vietnamProvinces';
import { updateSellerShopProfile, uploadShopAvatarFile } from '@/features/catalog/services/shops';
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
  const { t } = useTranslation('seller');
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
        if (profile.isShopSuspended) throw new Error(t('settings.editor.suspendedErr'));

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
          {t('settings.editor.suspendedBanner')}
          {profile.suspensionReason
            ? ` ${t('settings.editor.suspendedReason', { reason: profile.suspensionReason })}`
            : ''}
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
                    {t('settings.editor.logoTitle')}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {t('settings.editor.logoDesc')}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-blue-200 bg-white text-2xl text-blue-600 shadow-xs">
                  {displayedShopAvatar ? (
                    <img
                      src={displayedShopAvatar}
                      alt={form.storeName || t('settings.editor.logoAlt')}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ShopOutlined />
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition">
                      <UploadOutlined /> {t('settings.editor.uploadLogo')}
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
                        <DeleteOutlined /> {t('settings.editor.removeLogo')}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">{t('settings.editor.logoFormat')}</p>
                </div>
              </div>
            </div>

            <label className={sellerLabelClass}>
              {t('settings.editor.storeName')}
              <input
                className={sellerInputClass}
                required
                maxLength={160}
                value={form.storeName}
                onChange={(e) => setField('storeName', e.target.value)}
              />
            </label>
            <label className={sellerLabelClass}>
              {t('settings.editor.storeDesc')}
              <textarea
                className={sellerInputClass}
                rows={5}
                maxLength={3000}
                value={form.storeDescription}
                onChange={(e) => setField('storeDescription', e.target.value)}
                placeholder={t('settings.editor.storeDescPlaceholder')}
              />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className={sellerLabelClass}>
                {t('settings.editor.phone')}
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
                {t('settings.editor.businessEmail')}
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
              {t('settings.editor.brandHint')}
            </p>
          </>
        ) : (
          <>
            <label className={sellerLabelClass}>
              {t('settings.editor.street')}
              <input
                className={sellerInputClass}
                required
                maxLength={300}
                value={form.street}
                onChange={(e) => setField('street', e.target.value)}
                placeholder={t('settings.editor.streetPlaceholder')}
              />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className={sellerLabelClass}>
                {t('settings.editor.ward')}
                <input
                  className={sellerInputClass}
                  maxLength={150}
                  value={form.ward}
                  onChange={(e) => setField('ward', e.target.value)}
                />
              </label>
              <label className={sellerLabelClass}>
                {t('settings.editor.district')}
                <input
                  className={sellerInputClass}
                  maxLength={150}
                  value={form.district}
                  onChange={(e) => setField('district', e.target.value)}
                />
              </label>
            </div>
            <label className={sellerLabelClass}>
              {t('settings.editor.city')}
              <select
                className={sellerInputClass}
                required
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
              >
                <option value="">{t('settings.editor.selectCity')}</option>
                {form.city && !VIETNAM_PROVINCES.includes(form.city) && (
                  <option value={form.city}>
                    {t('settings.editor.savedSuffix', { city: form.city })}
                  </option>
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
                <EnvironmentOutlined /> {t('settings.editor.coordsTitle')}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={sellerLabelClass}>
                  {t('settings.editor.latitude')}
                  <input
                    className={sellerInputClass}
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    value={form.latitude}
                    onChange={(e) => setField('latitude', e.target.value)}
                    placeholder={t('settings.editor.latPlaceholder')}
                  />
                </label>
                <label className={sellerLabelClass}>
                  {t('settings.editor.longitude')}
                  <input
                    className={sellerInputClass}
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    value={form.longitude}
                    onChange={(e) => setField('longitude', e.target.value)}
                    placeholder={t('settings.editor.lonPlaceholder')}
                  />
                </label>
              </div>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                {t('settings.editor.coordsHint')}
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
          {t('settings.editor.cancelChanges')}
        </SellerButton>
        <SellerButton type="submit" disabled={action.pending || profile.isShopSuspended}>
          <SaveOutlined />{' '}
          {action.pending ? t('settings.editor.saving') : t('settings.editor.saveChanges')}
        </SellerButton>
      </div>
    </form>
  );
}
