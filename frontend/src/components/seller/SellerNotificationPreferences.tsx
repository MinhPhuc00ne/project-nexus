import { useState, type FormEvent, type ReactElement } from 'react';
import { Bell as BellOutlined } from 'lucide-react';
import {
  Mail as MailOutlined,
  BellRing as NotificationOutlined,
  Save as SaveOutlined,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from '@/features/notifications/services/notifications';
import type { NotificationPreferences } from '../../types/notification.types';
import useProductResource from '../productDetail/useProductResource';
import { useToast } from '../ToastNotification';
import SellerResourceState from './SellerResourceState';
import { SellerButton } from './SellerUI';
import useSellerAction from './useSellerAction';

export default function SellerNotificationPreferences(): ReactElement {
  const resource = useProductResource(getNotificationPreferences);
  return (
    <SellerResourceState loading={resource.loading} error={resource.error} retry={resource.retry}>
      {resource.data && <PreferencesForm initial={resource.data} />}
    </SellerResourceState>
  );
}

function PreferencesForm({ initial }: { initial: NotificationPreferences }): ReactElement {
  const { t } = useTranslation('seller');
  const [preferences, setPreferences] = useState(initial.preferences);
  const [saved, setSaved] = useState(initial.preferences);
  const action = useSellerAction();
  const toast = useToast();
  const dirty = JSON.stringify(preferences) !== JSON.stringify(saved);
  function submit(event: FormEvent): void {
    event.preventDefault();
    void action.run(
      () => saveNotificationPreferences(preferences),
      (result) => {
        setPreferences(result.preferences);
        setSaved(result.preferences);
        toast.success(result.message);
      },
    );
  }
  return (
    <form className="space-y-5" onSubmit={submit}>
      <p className="text-xs leading-6 text-slate-500">{t('notifications.prefsIntro')}</p>
      <fieldset disabled={action.pending} className="space-y-3 disabled:opacity-60">
        {(
          [
            [
              'IN_APP',
              t('notifications.channels.inAppLabel'),
              t('notifications.channels.inAppDesc'),
              BellOutlined,
            ],
            [
              'EMAIL',
              t('notifications.channels.emailLabel'),
              t('notifications.channels.emailDesc'),
              MailOutlined,
            ],
            [
              'PUSH',
              t('notifications.channels.pushLabel'),
              t('notifications.channels.pushDesc'),
              NotificationOutlined,
            ],
          ] as const
        ).map(([channel, label, description, Icon]) => {
          const preference = preferences.find((item) => item.channel === channel);
          return (
            <label
              key={channel}
              className="flex cursor-pointer items-center gap-4 rounded-xl border border-blue-100 p-4 hover:bg-blue-50/40"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600">
                <Icon />
              </span>
              <span className="flex-1">
                <strong className="block text-sm font-semibold text-slate-800">{label}</strong>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                aria-label={label}
                checked={preference?.isEnabled ?? false}
                disabled={!preference || action.pending}
                onChange={(e) =>
                  setPreferences((current) =>
                    current.map((item) =>
                      item.channel === channel ? { ...item, isEnabled: e.target.checked } : item,
                    ),
                  )
                }
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="relative h-6 w-11 shrink-0 rounded-full bg-slate-200 transition peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 peer-focus-visible:ring-offset-2 after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:after:translate-x-5"
              />
            </label>
          );
        })}
      </fieldset>
      {action.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {action.error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        <SellerButton
          secondary
          disabled={action.pending || !dirty}
          onClick={() => setPreferences(saved)}
        >
          {t('notifications.cancelChanges')}
        </SellerButton>
        <SellerButton type="submit" disabled={action.pending || !dirty}>
          <SaveOutlined />{' '}
          {action.pending ? t('notifications.saving') : t('notifications.savePrefs')}
        </SellerButton>
      </div>
    </form>
  );
}
