import { useEffect, useState, type FormEvent } from 'react';
import { useToast } from '../../ToastNotification';
import { listBanners, saveBanner, type Banner, type BannerInput } from '../../../services/banners';

const blank: BannerInput = {
  title: '',
  imageUrl: '',
  targetUrl: null,
  startsAt: null,
  endsAt: null,
  isActive: true,
  priority: 0,
};
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Không thể cập nhật banner.';
export function useBannerManagement() {
  const toast = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<{ id?: string; value: BannerInput } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    listBanners()
      .then((items) => {
        if (active) setBanners(items);
      })
      .catch((cause) => {
        if (active) setError(message(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  const openEditor = (banner?: Banner) => {
    setFormError('');
    setEditor({ id: banner?.id, value: banner ? { ...banner } : { ...blank } });
  };
  const update = (patch: Partial<BannerInput>) => {
    setEditor((current) =>
      current ? { ...current, value: { ...current.value, ...patch } } : null,
    );
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || saving) return;
    const value = editor.value;
    if (value.startsAt && value.endsAt && Date.parse(value.startsAt) >= Date.parse(value.endsAt)) {
      setFormError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await saveBanner(
        {
          title: value.title.trim(),
          imageUrl: value.imageUrl.trim(),
          targetUrl: value.targetUrl?.trim() || null,
          startsAt: value.startsAt,
          endsAt: value.endsAt,
          isActive: value.isActive,
          priority: value.priority,
        },
        editor.id,
      );
      toast.success(editor.id ? 'Đã cập nhật banner.' : 'Đã thêm banner.');
      setEditor(null);
      setRevision((current) => current + 1);
    } catch (cause) {
      setFormError(message(cause));
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (banner: Banner) => {
    setSaving(true);
    try {
      await saveBanner(
        {
          title: banner.title,
          imageUrl: banner.imageUrl,
          targetUrl: banner.targetUrl,
          startsAt: banner.startsAt,
          endsAt: banner.endsAt,
          priority: banner.priority,
          isActive: !banner.isActive,
        },
        banner.id,
      );
      toast.success(banner.isActive ? 'Đã tắt banner.' : 'Đã bật banner.');
      setRevision((current) => current + 1);
    } catch (cause) {
      toast.error(message(cause));
    } finally {
      setSaving(false);
    }
  };

  return {
    banners,
    loading,
    error,
    search,
    setSearch,
    editor,
    saving,
    formError,
    openEditor,
    update,
    submit,
    toggle,
    closeEditor: () => setEditor(null),
    refresh: () => setRevision((current) => current + 1),
  };
}
