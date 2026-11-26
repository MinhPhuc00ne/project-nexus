import { useRef, useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react';
import { Trash2 as DeleteOutlined } from 'lucide-react';
import { Send as SendOutlined, Upload as UploadOutlined } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Popup from '../Popup';
import { useToast } from '../ToastNotification';
import {
  respondSellerDispute,
  safeEvidenceUrls,
  uploadDisputeEvidence,
} from '@/features/disputes/services/sellerDisputes';
import type { SellerDispute } from '../../types/seller-dispute.types';
import { getStoredUser } from '@/features/auth/services/auth';
import { useSellerSession } from './SellerSession';
import { canRespondDispute, getDisputeLabel } from './orderPresentation';
import { SellerButton } from './SellerUI';
import useSellerAction from './useSellerAction';
import { sellerInputClass, sellerLabelClass } from './SellerResourceState';

export default function SellerDisputeResponse({
  dispute,
  onClose,
  onSaved,
}: {
  dispute: SellerDispute;
  onClose: () => void;
  onSaved: () => void;
}): ReactElement {
  const { t } = useTranslation('seller');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const [progress, setProgress] = useState('');
  const uploaded = useRef(new Map<File, string>());
  const action = useSellerAction();
  const toast = useToast();
  const user = useSellerSession();
  const open = canRespondDispute(dispute.status);
  function choose(event: ChangeEvent<HTMLInputElement>): void {
    const added = [...(event.target.files || [])];
    event.target.value = '';
    setFileError('');
    if (files.length + added.length > 5) {
      setFileError(t('disputes.modal.maxFilesErr'));
      return;
    }
    if (
      added.some(
        (file) =>
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
          !/\.(jpe?g|png|webp)$/i.test(file.name) ||
          !file.size ||
          file.size > 25 * 1024 * 1024,
      )
    ) {
      setFileError(t('disputes.modal.invalidFileErr'));
      return;
    }
    setFiles((current) => [...current, ...added]);
  }
  function submit(event: FormEvent): void {
    event.preventDefault();
    void action.run(
      async () => {
        if (!open) throw new Error(t('disputes.modal.closedErr'));
        if (!notes.trim()) throw new Error(t('disputes.modal.emptyNotesErr'));
        const assertSession = (): void => {
          if (getStoredUser()?.id !== user.id)
            throw new Error(t('disputes.modal.sessionChangedErr'));
        };
        const urls: string[] = [];
        for (const [index, file] of files.entries()) {
          assertSession();
          setProgress(
            t('disputes.modal.uploadingImg', { current: index + 1, total: files.length }),
          );
          let url = uploaded.current.get(file);
          if (!url) {
            url = await uploadDisputeEvidence(file);
            uploaded.current.set(file, url);
          }
          urls.push(url);
        }
        setProgress(t('disputes.modal.submitting'));
        assertSession();
        return respondSellerDispute(dispute.id, notes, urls);
      },
      (result) => {
        toast.success(result.message);
        onSaved();
        onClose();
      },
    );
  }
  return (
    <Popup
      isOpen
      onClose={() => {
        if (!action.pending) onClose();
      }}
      title={t('disputes.modal.title')}
      size="lg"
      closeOnEsc={!action.pending}
      closeOnOverlay={!action.pending}
      showCloseButton={!action.pending}
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6">
          <strong className="block break-all text-blue-800">
            {t('disputes.modal.orderId', { id: dispute.orderId })}
          </strong>
          <p>
            {dispute.openedBy.fullName} · {getDisputeLabel(dispute.status)}
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words text-slate-700">{dispute.reason}</p>
        </div>
        {safeEvidenceUrls(dispute.evidenceUrls).length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold text-slate-700">
              {t('disputes.modal.existingEvidence')}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {safeEvidenceUrls(dispute.evidenceUrls).map((url, index) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-lg border border-blue-100 px-3 py-2 text-xs text-blue-700 hover:bg-blue-50"
                  >
                    {t('disputes.modal.evidenceItem', { index: index + 1 })}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {dispute.resolutionNotes && (
          <section>
            <h3 className="mb-2 text-xs font-semibold">{t('disputes.modal.resolutionHistory')}</h3>
            <p className="max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-600">
              {dispute.resolutionNotes}
            </p>
          </section>
        )}
        {open ? (
          <fieldset disabled={action.pending} className="space-y-4 disabled:opacity-60">
            <label className={sellerLabelClass}>
              {t('disputes.modal.notesLabel')}
              <textarea
                className={sellerInputClass}
                required
                maxLength={10000}
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('disputes.modal.notesPlaceholder')}
              />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-medium text-blue-700">
              <UploadOutlined />
              {t('disputes.modal.chooseImages')}
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={choose}
              />
            </label>
            <p className="text-xs text-slate-500">{t('disputes.modal.uploadHint')}</p>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-xs"
                >
                  <span className="min-w-0 break-all">
                    {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <button
                    type="button"
                    aria-label={t('disputes.modal.removeImageAria', { name: file.name })}
                    className="shrink-0 p-1 text-red-600"
                    onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                  >
                    <DeleteOutlined />
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : (
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            {t('disputes.modal.closedNotice')}
          </p>
        )}
        {action.pending && (
          <p role="status" className="text-xs text-blue-700">
            {progress || t('disputes.modal.processing')}
          </p>
        )}
        {(fileError || action.error) && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {fileError || action.error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <SellerButton secondary disabled={action.pending} onClick={onClose}>
            {t('disputes.modal.close')}
          </SellerButton>
          {open && (
            <SellerButton type="submit" disabled={action.pending || !notes.trim()}>
              <SendOutlined />
              {action.pending ? t('disputes.modal.sending') : t('disputes.modal.submit')}
            </SellerButton>
          )}
        </div>
      </form>
    </Popup>
  );
}
