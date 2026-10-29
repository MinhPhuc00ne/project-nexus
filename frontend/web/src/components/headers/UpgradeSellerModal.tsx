import React, { useEffect, useState } from 'react';
import { Role } from '@nexus/types';
import { ShoppingBag, Clock, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import Popup from '../Popup';
import { createSellerRequest, getMySellerRequests } from '../../services/users';
import type { SellerUpgradeRequest, UserProfile } from '../../types';
import {
  getShippingDistricts,
  getShippingProvinces,
  getShippingWards,
} from '../../services/shipping';
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
          setUpgradeError(err instanceof Error ? err.message : 'Không thể tải lịch sử yêu cầu.');
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
            err instanceof Error ? err.message : 'Không thể tải danh sách Tỉnh/Thành phố từ GHN.',
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
            err instanceof Error ? err.message : 'Không thể tải danh sách Quận/Huyện từ GHN.',
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
          setLocationError(
            err instanceof Error ? err.message : 'Không thể tải danh sách Phường/Xã từ GHN.',
          );
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
      setUpgradeError('Vui lòng nhập Tên gian hàng và Số điện thoại liên hệ.');
      return;
    }
    if (!proofFile) {
      setUpgradeError('Vui lòng tải lên tài liệu chứng minh (CCCD hoặc Giấy phép kinh doanh).');
      return;
    }

    if (!street.trim() || !city || !district || !ward) {
      setUpgradeError(
        'Vui lòng nhập Số nhà, tên đường và chọn đủ Tỉnh/Thành phố, Quận/Huyện, Phường/Xã của gian hàng.',
      );
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
      const successMsg = res.message || 'Gửi yêu cầu nâng cấp thành công!';
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
      setUpgradeError(err instanceof Error ? err.message : 'Gửi yêu cầu thất bại.');
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
              ? 'Thông Tin Gian Hàng Người Bán'
              : 'Đăng Ký Nâng Cấp Thành Người Bán (Seller)'}
          </span>
        </div>
      }
      size="lg"
    >
      {isLoadingRequests ? (
        <div className="py-12 text-center text-slate-500">
          <Clock className="w-8 h-8 mx-auto mb-2 text-slate-400 animate-spin" />
          Đang tải dữ liệu hồ sơ từ máy chủ...
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
                    Hồ sơ của bạn đang được Ban Quản Trị xét duyệt!
                  </h4>
                  <p className="text-amber-800">
                    Bạn đã gửi yêu cầu nâng cấp tài khoản lên Seller. Quản trị viên đang tiến hành
                    kiểm tra thông tin và tài liệu chứng minh.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-2">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Tên gian hàng:</span>
                  <strong className="text-slate-800">{pendingReq.storeName}</strong>
                </div>
                {(pendingReq.street || pendingReq.city) && (
                  <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                    <span className="text-slate-500 shrink-0">Địa chỉ gian hàng:</span>
                    <span className="text-slate-800 font-medium text-right break-words min-w-0">
                      {[pendingReq.street, pendingReq.ward, pendingReq.district, pendingReq.city]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Số điện thoại liên hệ:</span>
                  <span className="text-slate-800 font-medium">{pendingReq.phone}</span>
                </div>
                {pendingReq.businessEmail && (
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Email kinh doanh:</span>
                    <span className="text-slate-800 font-medium">{pendingReq.businessEmail}</span>
                  </div>
                )}
                {pendingReq.identityCardNumber && (
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Số CCCD/CMND:</span>
                    <span className="text-slate-800 font-medium">
                      {pendingReq.identityCardNumber}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Thời gian nộp:</span>
                  <span className="text-slate-800">
                    {new Date(pendingReq.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-500">Trạng thái:</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    ĐANG CHỜ DUYỆT (PENDING)
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  className="px-5 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition"
                  onClick={handleClose}
                >
                  Đã hiểu
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
                <strong>Yêu cầu trước đó bị từ chối:</strong>{' '}
                {upgradeRequests[0].rejectionReason || 'Hồ sơ chưa đạt tiêu chuẩn sàn.'}
                <p className="text-xs text-red-600 mt-1">
                  Vui lòng bổ sung giấy tờ và thông tin chính xác để gửi lại yêu cầu.
                </p>
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
                  Số nhà, tên đường <span className="text-red-500">*</span>
                </label>
                <input
                  id="seller-store-street"
                  name="street"
                  type="text"
                  required
                  autoComplete="address-line1"
                  placeholder="VD: 720A Điện Biên Phủ"
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
                  Tỉnh/Thành phố <span className="text-red-500">*</span>
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
                    Chọn Tỉnh/Thành phố
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
                  Quận/Huyện <span className="text-red-500">*</span>
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
                    {isLoadingDistricts && provinceId ? 'Đang tải từ GHN…' : 'Chọn Quận/Huyện'}
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
                  Phường/Xã <span className="text-red-500">*</span>
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
                    {isLoadingWards && districtId ? 'Đang tải từ GHN…' : 'Chọn Phường/Xã'}
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
                Không thể tải địa chỉ từ GHN: {locationError}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên Gian Hàng / Thương Hiệu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Cổ Vật Hoàng Gia Store"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  disabled={isSubmittingUpgrade}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số Điện Thoại Liên Hệ <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="VD: 0987654321"
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
                  Email Kinh Doanh
                </label>
                <input
                  type="email"
                  placeholder="VD: shop@domain.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  disabled={isSubmittingUpgrade}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số CCCD / CMND / Mã Doanh Nghiệp
                </label>
                <input
                  type="text"
                  placeholder="VD: 001202008888"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={identityCardNumber}
                  onChange={(e) => setIdentityCardNumber(e.target.value)}
                  disabled={isSubmittingUpgrade}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mô Tả Gian Hàng & Sản Phẩm Kinh Doanh
              </label>
              <textarea
                rows={2}
                placeholder="Mô tả ngắn gọn về nguồn gốc sản phẩm, lĩnh vực hoạt động..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
                disabled={isSubmittingUpgrade}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tài Liệu Đính Kèm Chứng Minh (Ảnh CCCD / GPKD){' '}
                <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-slate-300 hover:border-orange-500 hover:bg-orange-50/50 rounded-lg cursor-pointer transition text-sm text-slate-600">
                  <Upload className="w-4 h-4 text-orange-500" />
                  <span>
                    {proofFile ? proofFile.name : 'Chọn tệp đính kèm (Ảnh/PDF tối đa 15MB)'}
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
                    Xóa tệp
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Hệ thống yêu cầu tài liệu để đảm bảo tính pháp lý và bảo vệ quyền lợi người mua trên
                sàn.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
                onClick={handleClose}
                disabled={isSubmittingUpgrade}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmittingUpgrade}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#f24e1e] hover:bg-[#d94217] rounded-lg transition disabled:opacity-50"
              >
                {isSubmittingUpgrade ? 'Đang gửi hồ sơ...' : 'Nộp Hồ Sơ Xét Duyệt'}
              </button>
            </div>
          </form>
        </div>
      )}
    </Popup>
  );
};

export default UpgradeSellerModal;
