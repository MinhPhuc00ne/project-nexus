import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Role } from '@nexus/types';
import { getIntlLocale } from '../../i18n/config';
import { ShoppingBag, Clock, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import Popup from '../Popup';
import { createSellerRequest, getMySellerRequests } from '@/features/account/services/users';
import type { SellerUpgradeRequest, UserProfile } from '../../types';
import {
  getShippingDistricts,
  getShippingProvinces,
  getShippingWards,
} from '@/features/shipping/services/shipping';
import type { GhnDistrict, GhnProvince, GhnWard } from '../../types/shipping.types';

interface UpgradeSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onSuccess?: (message: string) => void;
}

export const UpgradeSellerModal: React.FC<UpgradeSellerModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation('common');
  const [upgradeRequests, setUpgradeRequests] = useState<SellerUpgradeRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeSuccess, setUpgradeSuccess] = useState('');

  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [street, setStreet] = useState('');
  const [ward, setWard] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [provinces, setProvinces] = useState<GhnProvince[]>([]);
  const [districts, setDistricts] = useState<GhnDistrict[]>([]);
  const [wards, setWards] = useState<GhnWard[]>([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [phone, setPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [identityCardNumber, setIdentityCardNumber] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setIsLoadingRequests(true);
    setUpgradeError('');
    setUpgradeSuccess('');

    if (profile?.phoneNumber) setPhone(profile.phoneNumber);
    if (profile?.email) setBusinessEmail(profile.email);

    getMySellerRequests()
      .then((res) => {
        if (active) {
          setUpgradeRequests(res.requests || []);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setUpgradeError(
            err instanceof Error ? err.message : t('upgradeSeller.loadHistoryFailed'),
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingRequests(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, profile]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setIsLoadingProvinces(true);
    setLocationError('');

    getShippingProvinces()
      .then((data) => {
        if (active) setProvinces(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setLocationError(
            err instanceof Error ? err.message : t('upgradeSeller.loadProvincesFailed'),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingProvinces(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!provinceId) {
      setDistricts([]);
      return;
    }

    let active = true;
    setIsLoadingDistricts(true);
    setLocationError('');

    getShippingDistricts(Number(provinceId))
      .then((data) => {
        if (active) setDistricts(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setLocationError(
            err instanceof Error ? err.message : t('upgradeSeller.loadDistrictsFailed'),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingDistricts(false);
      });

    return () => {
      active = false;
    };
  }, [provinceId]);

  useEffect(() => {
    if (!districtId) {
      setWards([]);
      return;
    }

    let active = true;
    setIsLoadingWards(true);
    setLocationError('');

    getShippingWards(Number(districtId))
      .then((data) => {
        if (active) setWards(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setLocationError(err instanceof Error ? err.message : t('upgradeSeller.loadWardsFailed'));
        }
      })
      .finally(() => {
        if (active) setIsLoadingWards(false);
      });

    return () => {
      active = false;
    };
  }, [districtId]);

  const handleSubmitUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !phone.trim()) {
      setUpgradeError(t('upgradeSeller.missingBasicInfo'));
      return;
    }
    if (!proofFile) {
      setUpgradeError(t('upgradeSeller.missingProofFile'));
      return;
    }

    if (!street.trim() || !city || !district || !ward) {
      setUpgradeError(t('upgradeSeller.missingAddress'));
      return;
    }

    setIsSubmittingUpgrade(true);
    setUpgradeError('');
    setUpgradeSuccess('');

    try {
      const formData = new FormData();
      formData.append('storeName', storeName.trim());
      formData.append('phone', phone.trim());
      formData.append('street', street.trim());
      formData.append('ward', ward);
      formData.append('district', district);
      formData.append('city', city.trim());
      if (storeDescription.trim()) formData.append('storeDescription', storeDescription.trim());
      if (businessEmail.trim()) formData.append('businessEmail', businessEmail.trim());
      if (identityCardNumber.trim()) {
        formData.append('identityCardNumber', identityCardNumber.trim());
      }
      formData.append('file', proofFile);

      const res = await createSellerRequest(formData);
      const successMsg = res.message || t('upgradeSeller.submitSuccess');
      setUpgradeSuccess(successMsg);
      if (onSuccess) onSuccess(successMsg);

      const updated = await getMySellerRequests();
      setUpgradeRequests(updated.requests || []);
      setStoreName('');
      setStoreDescription('');
      setStreet('');
      setWard('');
      setDistrict('');
      setCity('');
      setProvinceId('');
      setDistrictId('');
      setWardCode('');
      setIdentityCardNumber('');
      setProofFile(null);
    } catch (err: unknown) {
      setUpgradeError(err instanceof Error ? err.message : t('upgradeSeller.submitFailed'));
    } finally {
      setIsSubmittingUpgrade(false);
    }
  };

  const handleClose = () => {
    if (!isSubmittingUpgrade) onClose();
  };

  return (
    <Popup
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
          <ShoppingBag className="w-5 h-5 text-orange-500" />
          <span>
            {profile?.role === Role.SELLER
              ? t('upgradeSeller.titleSeller')
              : t('upgradeSeller.titleUpgrade')}
          </span>
        </div>
      }
      size="lg"
    >
      {isLoadingRequests ? (
        <div className="py-12 text-center text-slate-500">
          <Clock className="w-8 h-8 mx-auto mb-2 text-slate-400 animate-spin" />
          {t('upgradeSeller.loadingProfile')}
        </div>
      ) : upgradeRequests.some((r) => r.status === 'PENDING') ? (
        (() => {
          const pendingReq = upgradeRequests.find((r) => r.status === 'PENDING')!;
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900">
                <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <h4 className="font-bold text-amber-900 mb-1">
                    {t('upgradeSeller.pendingTitle')}
                  </h4>
                  <p className="text-amber-800">{t('upgradeSeller.pendingDesc')}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-2">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">{t('upgradeSeller.shopNameLabel')}</span>
                  <strong className="text-slate-800">{pendingReq.storeName}</strong>
                </div>
                {(pendingReq.street || pendingReq.city) && (
                  <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                    <span className="text-slate-500 shrink-0">
                      {t('upgradeSeller.shopAddressLabel')}
                    </span>
                    <span className="text-slate-800 font-medium text-right break-words min-w-0">
                      {[pendingReq.street, pendingReq.ward, pendingReq.district, pendingReq.city]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">{t('upgradeSeller.phoneLabel')}</span>
                  <span className="text-slate-800 font-medium">{pendingReq.phone}</span>
                </div>
                {pendingReq.businessEmail && (
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">{t('upgradeSeller.businessEmailLabel')}</span>
                    <span className="text-slate-800 font-medium">{pendingReq.businessEmail}</span>
                  </div>
                )}
                {pendingReq.identityCardNumber && (
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">{t('upgradeSeller.idNumberLabel')}</span>
                    <span className="text-slate-800 font-medium">
                      {pendingReq.identityCardNumber}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">{t('upgradeSeller.submittedAtLabel')}</span>
                  <span className="text-slate-800">
                    {new Date(pendingReq.createdAt).toLocaleString(getIntlLocale(i18n.language))}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-500">{t('upgradeSeller.statusLabel')}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    {t('upgradeSeller.pendingBadge')}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  className="px-5 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition"
                  onClick={handleClose}
                >
                  {t('upgradeSeller.understood')}
                </button>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="space-y-4">
          {upgradeRequests.length > 0 && upgradeRequests[0].status === 'REJECTED' && (
            <div className="p-3 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <strong>{t('upgradeSeller.rejectedPrefix')}</strong>{' '}
                {upgradeRequests[0].rejectionReason || t('upgradeSeller.rejectedFallback')}
                <p className="text-xs text-red-600 mt-1">{t('upgradeSeller.rejectedHint')}</p>
              </div>
            </div>
          )}

          {upgradeSuccess && (
            <div className="p-3 text-sm text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{upgradeSuccess}</span>
            </div>
          )}

          {upgradeError && (
            <div className="p-3 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200">
              {upgradeError}
            </div>
          )}

          <form onSubmit={handleSubmitUpgrade} className="space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="seller-store-street"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t('upgradeSeller.streetLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="seller-store-street"
                  name="street"
                  type="text"
                  required
                  autoComplete="address-line1"
                  placeholder={t('upgradeSeller.streetPlaceholder')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  disabled={isSubmittingUpgrade}
                />
              </div>
              <div>
                <label
                  htmlFor="seller-store-city"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t('upgradeSeller.provinceLabel')} <span className="text-red-500">*</span>
                </label>
                <select
                  id="seller-store-city"
                  name="city"
                  required
                  autoComplete="address-level1"
                  className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={provinceId}
                  onChange={(e) => {
                    const nextProvinceId = e.target.value;
                    const selectedProvince = provinces.find(
                      (province) => String(province.provinceId) === nextProvinceId,
                    );
                    setProvinceId(nextProvinceId);
                    setCity(selectedProvince?.provinceName || '');
                    setDistrictId('');
                    setDistrict('');
                    setWardCode('');
                    setWard('');
                  }}
                  disabled={isSubmittingUpgrade || isLoadingProvinces}
                >
                  <option value="" disabled>
                    {t('upgradeSeller.selectProvince')}
                  </option>
                  {provinces.map((province) => (
                    <option key={province.provinceId} value={province.provinceId}>
                      {province.provinceName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="seller-store-district"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t('upgradeSeller.districtLabel')} <span className="text-red-500">*</span>
                </label>
                <select
                  id="seller-store-district"
                  name="district"
                  required
                  className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                  value={districtId}
                  onChange={(e) => {
                    const nextDistrictId = e.target.value;
                    const selectedDistrict = districts.find(
                      (item) => String(item.districtId) === nextDistrictId,
                    );
                    setDistrictId(nextDistrictId);
                    setDistrict(selectedDistrict?.districtName || '');
                    setWardCode('');
                    setWard('');
                  }}
                  disabled={!provinceId || isSubmittingUpgrade || isLoadingDistricts}
                >
                  <option value="">
                    {isLoadingDistricts && provinceId
                      ? t('upgradeSeller.loadingGhn')
                      : t('upgradeSeller.selectDistrict')}
                  </option>
                  {districts.map((item) => (
                    <option key={item.districtId} value={item.districtId}>
                      {item.districtName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="seller-store-ward"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t('upgradeSeller.wardLabel')} <span className="text-red-500">*</span>
                </label>
                <select
                  id="seller-store-ward"
                  name="ward"
                  required
                  className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                  value={wardCode}
                  onChange={(e) => {
                    const nextWardCode = e.target.value;
                    const selectedWard = wards.find((item) => item.wardCode === nextWardCode);
                    setWardCode(nextWardCode);
                    setWard(selectedWard?.wardName || '');
                  }}
                  disabled={!districtId || isSubmittingUpgrade || isLoadingWards}
                >
                  <option value="">
                    {isLoadingWards && districtId
                      ? t('upgradeSeller.loadingGhn')
                      : t('upgradeSeller.selectWard')}
                  </option>
                  {wards.map((item) => (
                    <option key={item.wardCode} value={item.wardCode}>
                      {item.wardName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {locationError && (
              <div
                role="alert"
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
              >
                {t('upgradeSeller.ghnLoadError', { error: locationError })}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('upgradeSeller.storeNameLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('upgradeSeller.storeNamePlaceholder')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  disabled={isSubmittingUpgrade}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('upgradeSeller.contactPhoneLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder={t('upgradeSeller.phonePlaceholder')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmittingUpgrade}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('upgradeSeller.businessEmailFieldLabel')}
                </label>
                <input
                  type="email"
                  placeholder={t('upgradeSeller.businessEmailPlaceholder')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  disabled={isSubmittingUpgrade}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('upgradeSeller.identityCardLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('upgradeSeller.identityCardPlaceholder')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={identityCardNumber}
                  onChange={(e) => setIdentityCardNumber(e.target.value)}
                  disabled={isSubmittingUpgrade}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('upgradeSeller.descriptionLabel')}
              </label>
              <textarea
                rows={2}
                placeholder={t('upgradeSeller.descriptionPlaceholder')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
                disabled={isSubmittingUpgrade}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('upgradeSeller.proofFileLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-slate-300 hover:border-orange-500 hover:bg-orange-50/50 rounded-lg cursor-pointer transition text-sm text-slate-600">
                  <Upload className="w-4 h-4 text-orange-500" />
                  <span>
                    {proofFile ? proofFile.name : t('upgradeSeller.proofFilePlaceholder')}
                  </span>
                  <input
                    type="file"
                    required
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    disabled={isSubmittingUpgrade}
                  />
                </label>
                {proofFile && (
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => setProofFile(null)}
                    disabled={isSubmittingUpgrade}
                  >
                    {t('upgradeSeller.removeFile')}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{t('upgradeSeller.legalNote')}</p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
                onClick={handleClose}
                disabled={isSubmittingUpgrade}
              >
                {t('upgradeSeller.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmittingUpgrade}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#f24e1e] hover:bg-[#d94217] rounded-lg transition disabled:opacity-50"
              >
                {isSubmittingUpgrade ? t('upgradeSeller.submitting') : t('upgradeSeller.submit')}
              </button>
            </div>
          </form>
        </div>
      )}
    </Popup>
  );
};

export default UpgradeSellerModal;
