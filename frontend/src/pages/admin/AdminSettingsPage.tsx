import { RefreshCw, Save, Settings2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getAdminSettings, updateAdminSettings } from '@/features/admin/services/admin';
import type { SystemSettings, UpdateSystemSettingsDto } from '../../types/admin-settings.types';
import { useToast } from '../../components/ToastNotification';
import { Button, Panel } from '../../components/adminDashboard/shared/AdminUI';
import {
  settingsFields,
  settingsGroups,
} from '../../components/adminDashboard/Settings/settingsFields';

type SettingsForm = Record<keyof SystemSettings, string>;

function toForm(settings: SystemSettings): SettingsForm {
  return Object.fromEntries(
    settingsFields.map(({ key }) => [key, String(settings[key])]),
  ) as SettingsForm;
}

export default function AdminSettingsPage() {
  const { t } = useTranslation('admin');
  const { token } = useAuth();
  const toast = useToast();
  const [saved, setSaved] = useState<SystemSettings | null>(null);
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);
  const saveRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setSaved(null);
    setForm(null);
    setLoadError('');
    setSaveError('');
    setPending(false);
    void getAdminSettings(controller.signal)
      .then((settings) => {
        if (controller.signal.aborted) return;
        setSaved(settings);
        setForm(toForm(settings));
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setLoadError(cause instanceof Error ? cause.message : t('settings.loadErr'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      saveRequest.current?.abort();
      saveRequest.current = null;
    };
  }, [token, revision, t]);

  const dirty =
    !!form &&
    !!saved &&
    settingsFields.some(({ key }) => Number(form[key]) !== saved[key] || !form[key].trim());

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || !saved || saveRequest.current || !dirty) return;
    setSaveError('');
    const changes: UpdateSystemSettingsDto = {};
    for (const field of settingsFields) {
      const raw = form[field.key].trim();
      const value = Number(raw);
      if (!raw || !Number.isFinite(value) || value < field.min || value > field.max) {
        setSaveError(
          t('settings.rangeErr', {
            label: t(`settings.fields.${field.key}`),
            min: field.min,
            max: field.max,
          }),
        );
        return;
      }
      if (value !== saved[field.key]) changes[field.key] = value;
    }
    const controller = new AbortController();
    saveRequest.current = controller;
    setPending(true);
    try {
      const result = await updateAdminSettings(changes, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.success) throw new Error(result.message || t('settings.saveErr'));
      setSaved(result.settings);
      setForm(toForm(result.settings));
      toast.success(result.message);
    } catch (cause) {
      if (!controller.signal.aborted) {
        const message = cause instanceof Error ? cause.message : t('settings.saveErr');
        setSaveError(message);
        toast.error(message);
      }
    } finally {
      if (saveRequest.current === controller) {
        saveRequest.current = null;
        setPending(false);
      }
    }
  };

  return (
    <Panel
      title={t('settings.title')}
      subtitle={t('settings.subtitle')}
      icon={<Settings2 size={19} />}
    >
      {loading ? (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          {t('settings.loading')}
        </p>
      ) : loadError ? (
        <div role="alert" className="space-y-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p>{loadError}</p>
          <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
            <RefreshCw size={14} /> {t('settings.retry')}
          </Button>
        </div>
      ) : (
        form &&
        saved && (
          <form onSubmit={submit} className="space-y-5" aria-busy={pending}>
            <div className="grid items-start gap-5 xl:grid-cols-2">
              {settingsGroups.map((group) => (
                <fieldset
                  key={group.id}
                  disabled={pending}
                  className="min-w-0 space-y-4 rounded-xl border border-slate-200 p-4"
                >
                  <legend className="px-2 text-sm font-semibold text-slate-900">
                    {t(`settings.groups.${group.id}`)}
                  </legend>
                  {group.fields.map((field) => (
                    <label
                      key={field.key}
                      className="flex items-start justify-between gap-4 text-xs font-medium text-slate-600"
                    >
                      <span>
                        {t(`settings.fields.${field.key}`)}
                        <span className="mt-1 block font-normal text-slate-400">
                          {field.min}–{field.max}
                        </span>
                      </span>
                      <input
                        type="number"
                        name={field.key}
                        min={field.min}
                        max={field.max}
                        step="any"
                        required
                        value={form[field.key]}
                        onChange={(event) => {
                          setForm({ ...form, [field.key]: event.target.value });
                          setSaveError('');
                        }}
                        className="w-28 shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-3 outline-none focus:border-blue-400 disabled:opacity-60"
                      />
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
            {saveError && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {saveError}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
              {dirty && (
                <p className="mr-auto text-xs text-amber-700">{t('settings.unsavedChanges')}</p>
              )}
              <Button
                type="button"
                variant="secondary"
                disabled={pending || !dirty}
                onClick={() => {
                  setForm(toForm(saved));
                  setSaveError('');
                }}
              >
                {t('settings.reset')}
              </Button>
              <Button type="submit" disabled={pending || !dirty}>
                <Save size={15} />
                {pending ? t('settings.saving') : t('settings.save')}
              </Button>
            </div>
          </form>
        )
      )}
    </Panel>
  );
}
