import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Mail, Bell, BellRing, Save, Loader2, Check } from 'lucide-react';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from '../../services/notifications';
import type { NotificationPreference, NotificationChannel } from '../../types/notification.types';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const channelIcons: Record<NotificationChannel, React.ReactNode> = {
  IN_APP: <Bell size={18} className="text-blue-600" />,
  EMAIL: <Mail size={18} className="text-amber-600" />,
  PUSH: <BellRing size={18} className="text-purple-600" />,
};

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation('common');
  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    { channel: 'IN_APP', isEnabled: true },
    { channel: 'EMAIL', isEnabled: true },
    { channel: 'PUSH', isEnabled: false },
  ]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    async function loadPrefs() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await getNotificationPreferences();
        if (active && res?.preferences && Array.isArray(res.preferences)) {
          setPreferences(res.preferences);
        }
      } catch (err) {
        if (active) {
          console.warn('Could not load preferences, using fallback:', err);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadPrefs();
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (channel: NotificationChannel) => {
    setPreferences((prev) =>
      prev.map((p) => (p.channel === channel ? { ...p, isEnabled: !p.isEnabled } : p)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await saveNotificationPreferences(preferences);
      setSuccessMsg(res.message || t('notificationPrefs.saveSuccess'));
      if (onSaved) onSaved();
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('notificationPrefs.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 m-0">{t('notificationPrefs.title')}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500 m-0 leading-relaxed">
            {t('notificationPrefs.subtitle')}
          </p>

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <Loader2 size={20} className="animate-spin text-blue-600" />
              <span>{t('notificationPrefs.loading')}</span>
            </div>
          ) : (
            <div className="space-y-3">
              {(['IN_APP', 'EMAIL', 'PUSH'] as NotificationChannel[]).map((channel) => {
                const icon = channelIcons[channel];
                const currentPref = preferences.find((p) => p.channel === channel);
                const isChecked = currentPref?.isEnabled ?? true;

                return (
                  <div
                    key={channel}
                    onClick={() => handleToggle(channel)}
                    className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 bg-slate-50 rounded-lg shrink-0">{icon}</div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 m-0">
                          {t(`notificationPrefs.channels.${channel}.label`)}
                        </h4>
                        <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed">
                          {t(`notificationPrefs.channels.${channel}.desc`)}
                        </p>
                      </div>
                    </div>

                    <div className="relative inline-flex items-center shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        readOnly
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            {t('notificationPrefs.cancel')}
          </button>
          <button
            type="button"
            disabled={saving || loading}
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? t('notificationPrefs.saving') : t('notificationPrefs.save')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferencesModal;
