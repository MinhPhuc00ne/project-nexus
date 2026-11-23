import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../ToastNotification';
import {
  listBanners,
  saveBanner,
  saveBannerOrder,
  type Banner,
  type BannerInput,
} from '../../../services/banners.service';

const blank: BannerInput = {
  title: '',
  imageUrl: '',
  targetUrl: null,
  startsAt: null,
  endsAt: null,
  isActive: true,
  priority: 1,
};
export function useBannerManagement() {
  const { t } = useTranslation('admin');
  const errorMessage = (error: unknown) =>
    error instanceof Error ? error.message : t('banners.hook.updateErr');
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
        if (active) setError(errorMessage(cause));
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
    setEditor({
      id: banner?.id,
      value: banner
        ? { ...banner, priority: Math.max(1, banner.priority) }
        : {
            ...blank,
            priority: Math.min(1000, Math.max(0, ...banners.map((item) => item.priority)) + 1),
          },
    });
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
      toast.success(editor.id ? t('banners.hook.updatedToast') : t('banners.hook.createdToast'));
      setEditor(null);
      setRevision((current) => current + 1);
    } catch (cause) {
      setFormError(errorMessage(cause));
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
      toast.success(
        banner.isActive ? t('banners.hook.disabledToast') : t('banners.hook.enabledToast'),
      );
      setRevision((current) => current + 1);
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const reorder = async (sourceId: string, targetId: string) => {
    if (saving || loading || editor || search.trim() || sourceId === targetId) return;
    const from = banners.findIndex((banner) => banner.id === sourceId);
    const to = banners.findIndex((banner) => banner.id === targetId);
    if (from < 0 || to < 0) return;
    const ordered = [...banners];
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    setSaving(true);
    setBanners(ordered);
    try {
      setBanners(await saveBannerOrder(ordered));
      toast.success(t('banners.hook.reorderedToast'));
    } catch (cause) {
      toast.error(t('banners.hook.reorderErr', { message: errorMessage(cause) }));
    } finally {
      setSaving(false);
      setRevision((current) => current + 1);
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
    reorder,
    closeEditor: () => setEditor(null),
    refresh: () => setRevision((current) => current + 1),
  };
}
