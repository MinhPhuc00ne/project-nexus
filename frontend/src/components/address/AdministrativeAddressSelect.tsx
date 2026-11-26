import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Loader2 } from 'lucide-react';
import {
  getShippingProvinces,
  getShippingDistricts,
  getShippingWards,
} from '@/features/shipping/services/shipping';
import type { GhnProvince, GhnDistrict, GhnWard } from '@/features/shipping/types/shipping.types';

// Danh sách 63 Tỉnh/Thành phố dự phòng chuẩn hành chính Việt Nam khi GHN mạng chậm
const FALLBACK_PROVINCES = [
  'TP. Hồ Chí Minh',
  'Hà Nội',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'An Giang',
  'Bà Rịa - Vũng Tàu',
  'Bắc Giang',
  'Bắc Kạn',
  'Bạc Liêu',
  'Bắc Ninh',
  'Bến Tre',
  'Bình Định',
  'Bình Dương',
  'Bình Phước',
  'Bình Thuận',
  'Cà Mau',
  'Cao Bằng',
  'Đắk Lắk',
  'Đắk Nông',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Giang',
  'Hà Nam',
  'Hà Tĩnh',
  'Hải Dương',
  'Hậu Giang',
  'Hòa Bình',
  'Hưng Yên',
  'Khánh Hòa',
  'Kiên Giang',
  'Kon Tum',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Long An',
  'Nam Định',
  'Nghệ An',
  'Ninh Bình',
  'Ninh Thuận',
  'Phú Thọ',
  'Phú Yên',
  'Quảng Bình',
  'Quảng Nam',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sóc Trăng',
  'Sơn La',
  'Tây Ninh',
  'Thái Bình',
  'Thái Nguyên',
  'Thanh Hóa',
  'Thừa Thiên Huế',
  'Tiền Giang',
  'Trà Vinh',
  'Tuyên Quang',
  'Vĩnh Long',
  'Vĩnh Phúc',
  'Yên Bái',
];

export interface AdministrativeAddressSelectProps {
  city: string;
  district?: string;
  ward?: string;
  onChange: (values: { city: string; district: string; ward: string }) => void;
  disabled?: boolean;
  required?: boolean;
  size?: 'sm' | 'md';
}

function isJunkAdministrativeName(name: string): boolean {
  if (!name || typeof name !== 'string') return true;
  const lower = name.trim().toLowerCase();
  // Loại bỏ các tên test như "Hà Nội 02", "Tỉnh - 001"
  return (
    lower.includes('test') ||
    lower.includes('alert') ||
    lower.includes('demo') ||
    lower.includes('tỉnh - 0') ||
    /\b(0[1-9]|\d{3,})\b/.test(lower)
  );
}

function cleanAndSortProvinces(rawList: GhnProvince[]): GhnProvince[] {
  const filtered = rawList.filter((p) => !isJunkAdministrativeName(p.provinceName));

  const priorityOrder = [
    'TP. Hồ Chí Minh',
    'Thành phố Hồ Chí Minh',
    'Hà Nội',
    'Thành phố Hà Nội',
    'Đà Nẵng',
    'Hải Phòng',
    'Cần Thơ',
  ];

  return filtered.sort((a, b) => {
    const aPriority = priorityOrder.findIndex((name) =>
      a.provinceName.toLowerCase().includes(name.toLowerCase()),
    );
    const bPriority = priorityOrder.findIndex((name) =>
      b.provinceName.toLowerCase().includes(name.toLowerCase()),
    );

    if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
    if (aPriority !== -1) return -1;
    if (bPriority !== -1) return 1;

    return a.provinceName.localeCompare(b.provinceName, 'vi');
  });
}

function cleanDistricts(rawList: GhnDistrict[]): GhnDistrict[] {
  return rawList
    .filter((d) => !isJunkAdministrativeName(d.districtName))
    .sort((a, b) => a.districtName.localeCompare(b.districtName, 'vi'));
}

function cleanWards(rawList: GhnWard[]): GhnWard[] {
  return rawList
    .filter((w) => !isJunkAdministrativeName(w.wardName))
    .sort((a, b) => a.wardName.localeCompare(b.wardName, 'vi'));
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(tỉnh|thành phố|tp\.|tp)\s+/i, '')
    .trim();
}

export default function AdministrativeAddressSelect({
  city,
  district = '',
  ward = '',
  onChange,
  disabled = false,
  required = true,
  size = 'md',
}: AdministrativeAddressSelectProps) {
  const { t } = useTranslation('common');
  const [provinces, setProvinces] = useState<GhnProvince[]>([]);
  const [districts, setDistricts] = useState<GhnDistrict[]>([]);
  const [wards, setWards] = useState<GhnWard[]>([]);

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  const prevCityRef = useRef<string>(city);
  const prevDistrictRef = useRef<string>(district);

  // 1. Tải danh sách Tỉnh/Thành
  useEffect(() => {
    let isMounted = true;
    setLoadingProvinces(true);

    getShippingProvinces()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setProvinces(cleanAndSortProvinces(data));
        } else if (isMounted) {
          // Dùng fallback nếu API rỗng
          setProvinces(
            FALLBACK_PROVINCES.map((p, idx) => ({
              provinceId: idx + 1,
              provinceName: p,
              code: String(idx + 1),
            })),
          );
        }
      })
      .catch(() => {
        if (isMounted) {
          setProvinces(
            FALLBACK_PROVINCES.map((p, idx) => ({
              provinceId: idx + 1,
              provinceName: p,
              code: String(idx + 1),
            })),
          );
        }
      })
      .finally(() => {
        if (isMounted) setLoadingProvinces(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Tìm provinceId tương ứng với city hiện tại và tải danh sách Quận/Huyện
  useEffect(() => {
    if (!city.trim() || provinces.length === 0) {
      setDistricts([]);
      return;
    }

    const matchedProvince = provinces.find(
      (p) =>
        p.provinceName.toLowerCase() === city.toLowerCase() ||
        normalizeName(p.provinceName) === normalizeName(city),
    );

    if (!matchedProvince) return;

    let isMounted = true;
    setLoadingDistricts(true);

    getShippingDistricts(matchedProvince.provinceId)
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setDistricts(cleanDistricts(data));
        }
      })
      .catch(() => {
        if (isMounted) setDistricts([]);
      })
      .finally(() => {
        if (isMounted) setLoadingDistricts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [city, provinces]);

  // 3. Tìm districtId tương ứng với district hiện tại và tải danh sách Phường/Xã
  useEffect(() => {
    if (!district.trim() || districts.length === 0) {
      setWards([]);
      return;
    }

    const matchedDistrict = districts.find(
      (d) =>
        d.districtName.toLowerCase() === district.toLowerCase() ||
        normalizeName(d.districtName) === normalizeName(district),
    );

    if (!matchedDistrict) return;

    let isMounted = true;
    setLoadingWards(true);

    getShippingWards(matchedDistrict.districtId)
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setWards(cleanWards(data));
        }
      })
      .catch(() => {
        if (isMounted) setWards([]);
      })
      .finally(() => {
        if (isMounted) setLoadingWards(false);
      });

    return () => {
      isMounted = false;
    };
  }, [district, districts]);

  // Handle thay đổi Tỉnh / Thành phố
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCity = e.target.value;
    prevCityRef.current = selectedCity;
    prevDistrictRef.current = '';
    setDistricts([]);
    setWards([]);
    onChange({
      city: selectedCity,
      district: '',
      ward: '',
    });
  };

  // Handle thay đổi Quận / Huyện
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDistrict = e.target.value;
    prevDistrictRef.current = selectedDistrict;
    setWards([]);
    onChange({
      city,
      district: selectedDistrict,
      ward: '',
    });
  };

  // Handle thay đổi Phường / Xã
  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedWard = e.target.value;
    onChange({
      city,
      district,
      ward: selectedWard,
    });
  };

  const selectClasses =
    size === 'sm'
      ? 'w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 appearance-none disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer'
      : 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 appearance-none disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer';

  const labelClasses =
    size === 'sm'
      ? 'block text-[11px] font-bold text-slate-700 mb-1'
      : 'block text-xs font-bold text-slate-700 mb-1';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* 1. Tỉnh / Thành phố */}
      <div>
        <label className={labelClasses}>
          {t('addressSelect.provinceLabel')} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <select
            value={city}
            onChange={handleCityChange}
            disabled={disabled || loadingProvinces}
            required={required}
            className={selectClasses}
          >
            <option value="">
              {loadingProvinces
                ? t('addressSelect.loadingProvinces')
                : t('addressSelect.selectProvince')}
            </option>
            {provinces.map((p) => (
              <option key={p.provinceId} value={p.provinceName}>
                {p.provinceName}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            {loadingProvinces ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </div>
        </div>
      </div>

      {/* 2. Quận / Huyện */}
      <div>
        <label className={labelClasses}>
          {t('addressSelect.districtLabel')} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <select
            value={district}
            onChange={handleDistrictChange}
            disabled={disabled || !city || loadingDistricts}
            required={required}
            className={selectClasses}
          >
            <option value="">
              {!city
                ? t('addressSelect.selectProvinceFirst')
                : loadingDistricts
                  ? t('addressSelect.loadingDistricts')
                  : t('addressSelect.selectDistrict')}
            </option>
            {districts.map((d) => (
              <option key={d.districtId} value={d.districtName}>
                {d.districtName}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            {loadingDistricts ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </div>
        </div>
      </div>

      {/* 3. Phường / Xã */}
      <div>
        <label className={labelClasses}>
          {t('addressSelect.wardLabel')} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <select
            value={ward}
            onChange={handleWardChange}
            disabled={disabled || !district || loadingWards}
            required={required}
            className={selectClasses}
          >
            <option value="">
              {!district
                ? t('addressSelect.selectDistrictFirst')
                : loadingWards
                  ? t('addressSelect.loadingWards')
                  : t('addressSelect.selectWard')}
            </option>
            {wards.map((w) => (
              <option key={w.wardCode} value={w.wardName}>
                {w.wardName}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            {loadingWards ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
