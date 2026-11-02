import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../ToastNotification';
import { useSellerSession } from './SellerSession';
import { useSellerWorkspace } from './SellerWorkspace';
import {
  emptyProductForm,
  flattenCategories,
  getProductCategories,
  getMyProducts,
  sellerProductToForm,
  publishSellerProduct,
  updateProductSale,
  type ProductCategory,
  type SellerProduct,
} from '../../services/sellerProducts';
import { type ProductOptionGroup, type ProductSaleConfig } from '../../services/productExtras';

const defaultSaleConfig: ProductSaleConfig = {
  enabled: false,
  discountPercent: 10,
  salePrice: 0,
  label: 'FLASH SALE',
  startAt: '',
  endAt: '',
};

function withOptionIds(options: ProductOptionGroup[]): ProductOptionGroup[] {
  return options.map((option, index) => ({
    ...option,
    id: option.id ?? `saved-option-${index}-${option.name}`,
  }));
}

export default function useSellerProductForm(productId?: string) {
  const navigate = useNavigate();
  const toast = useToast();
  const user = useSellerSession();
  const { refreshShop } = useSellerWorkspace();
  const [form, setForm] = useState({ ...emptyProductForm });
  const [saleConfig, setSaleConfig] = useState<ProductSaleConfig>({ ...defaultSaleConfig });
  const [optionGroups, setOptionGroups] = useState<ProductOptionGroup[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [product, setProduct] = useState<SellerProduct | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [productLoading, setProductLoading] = useState(Boolean(productId));
  const [productError, setProductError] = useState('');
  const [productRevision, setProductRevision] = useState(0);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoryError, setCategoryError] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const lock = useRef(false);
  const active = useRef(true);
  const uploaded = useRef(new Map<File, string>());

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  useEffect(() => {
    if (!productId) return;
    let current = true;
    setProductLoading(true);
    setProductError('');
    getMyProducts()
      .then((products) => {
        if (!current) return;
        const found = products.find((item) => item.id === productId);
        if (!found) throw new Error('Sản phẩm không tồn tại hoặc không thuộc gian hàng của bạn.');
        setProduct(found);
        setForm(sellerProductToForm(found));
        setExistingImages(found.images.map((image) => image.imageUrl));
        if (found.salePrice) {
          setSaleConfig({
            ...defaultSaleConfig,
            enabled: true,
            salePrice: Number(found.salePrice),
            startAt: found.saleStartsAt ?? '',
            endAt: found.saleEndsAt ?? '',
          });
        } else {
          setSaleConfig({ ...defaultSaleConfig });
        }
        setOptionGroups(found.options ? withOptionIds(found.options) : []);
      })
      .catch((cause) => {
        if (current)
          setProductError(cause instanceof Error ? cause.message : 'Không tải được sản phẩm.');
      })
      .finally(() => {
        if (current) setProductLoading(false);
      });
    return () => {
      current = false;
    };
  }, [productId, productRevision]);

  useEffect(() => {
    let current = true;
    setCategoryLoading(true);
    setCategoryError('');
    getProductCategories()
      .then(
        (result) => {
          if (current) setCategories(result);
        },
        (cause) => {
          if (current)
            setCategoryError(cause instanceof Error ? cause.message : 'Không tải được danh mục.');
        },
      )
      .finally(() => {
        if (current) setCategoryLoading(false);
      });
    return () => {
      current = false;
    };
  }, [revision]);

  const categoryOptions = flattenCategories(categories);
  const retryCategories = useCallback(() => setRevision((value) => value + 1), []);

  function reset() {
    if (lock.current) return;
    setForm(product ? sellerProductToForm(product) : { ...emptyProductForm });
    setSaleConfig(
      product?.salePrice
        ? { ...defaultSaleConfig, enabled: true, salePrice: Number(product.salePrice) }
        : { ...defaultSaleConfig },
    );
    setOptionGroups(product?.options ? withOptionIds(product.options) : []);
    setExistingImages(product?.images.map((image) => image.imageUrl) ?? []);
    setFiles([]);
    setError('');
    uploaded.current.clear();
  }

  async function submit() {
    if (lock.current) return;
    if (user.isShopSuspended || !user.isSellerActive) {
      setError('Gian hàng chưa được phép đăng bán. Vui lòng kiểm tra trạng thái người bán.');
      return;
    }
    if (productLoading || productError || (productId && !product)) return;
    if (
      categoryLoading ||
      categoryError ||
      !categoryOptions.some((category) => category.id === form.categoryId)
    ) {
      setError('Vui lòng chọn danh mục hợp lệ từ hệ thống.');
      return;
    }

    const basePrice = Number(form.price);
    if (saleConfig.enabled) {
      const pct = Number(saleConfig.discountPercent);
      if (!Number.isFinite(pct) || pct < 1 || pct > 95) {
        setError('Phần trăm giảm giá (Sale) phải từ 1% đến 95%.');
        return;
      }
    }

    lock.current = true;
    setPending(true);
    setError('');
    try {
      const saved = await publishSellerProduct(
        form,
        files,
        uploaded.current,
        (message) => {
          if (active.current) setProgress(message);
        },
        product ? { product, images: existingImages } : undefined,
        optionGroups,
      );
      if (!saved?.id)
        throw new Error(
          'Chưa xác nhận được kết quả đăng bán. Hãy kiểm tra danh sách sản phẩm trước khi gửi lại.',
        );

      const computedSalePrice =
        saleConfig.enabled && Number.isFinite(basePrice) && basePrice > 0
          ? saleConfig.salePrice > 0 && saleConfig.salePrice < basePrice
            ? Math.round(saleConfig.salePrice)
            : Math.max(
                1000,
                Math.round((basePrice * (100 - Number(saleConfig.discountPercent || 0))) / 100),
              )
          : 0;

      await updateProductSale(saved.id, {
        salePrice: saleConfig.enabled ? computedSalePrice : null,
        saleStartsAt: saleConfig.enabled && saleConfig.startAt ? saleConfig.startAt : null,
        saleEndsAt: saleConfig.enabled && saleConfig.endAt ? saleConfig.endAt : null,
      });

      if (active.current) {
        toast.success(
          product
            ? `Đã cập nhật sản phẩm ${saved.title}.`
            : `Đã đăng bán sản phẩm ${saved.title} thành công.`,
        );
        navigate('/seller/products', { replace: true });
        refreshShop();
      }
    } catch (cause) {
      if (active.current) {
        const message = cause instanceof Error ? cause.message : 'Không thể đăng bán sản phẩm.';
        setError(message);
        toast.error(message);
      }
    } finally {
      lock.current = false;
      if (active.current) {
        setPending(false);
        setProgress('');
      }
    }
  }

  return {
    form,
    setForm,
    saleConfig,
    setSaleConfig,
    optionGroups,
    setOptionGroups,
    files,
    setFiles,
    existingImages,
    setExistingImages,
    productLoading,
    productError,
    retryProduct: () => setProductRevision((value) => value + 1),
    categoryOptions,
    categoryLoading,
    categoryError,
    retryCategories,
    pending,
    progress,
    error,
    reset,
    submit,
  };
}
