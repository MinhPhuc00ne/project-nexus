import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flag, CheckCircle2, AlertCircle, Upload, X } from 'lucide-react';
import Popup from '../Popup';
import {
  PRODUCT_REPORT_REASONS,
  SHOP_REPORT_REASONS,
  submitReportApi,
  uploadReportEvidence,
  type ReportTargetType,
} from '../../services/reports.service';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetName: string;
  onReported?: (message: string) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  onReported,
}) => {
  const { t } = useTranslation('common');
  const reasons = targetType === 'PRODUCT' ? PRODUCT_REPORT_REASONS : SHOP_REPORT_REASONS;
  const [selectedReason, setSelectedReason] = useState(reasons[0]);
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  const isProduct = targetType === 'PRODUCT';
  const titleLabel = isProduct ? t('reportModal.titleProduct') : t('reportModal.titleShop');
  const targetNoun = isProduct ? t('reportModal.productNoun') : t('reportModal.shopNoun');

  const handleResetAndClose = () => {
    if (submitting) return;
    setSubmittedCode(null);
    setError('');
    setDescription('');
    setEvidenceFiles([]);
    setSelectedReason(reasons[0]);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const evidenceUrls = await Promise.all(evidenceFiles.map(uploadReportEvidence));
      const result = await submitReportApi({
        targetType,
        targetId,
        targetName,
        reason: selectedReason,
        description: description.trim(),
        evidenceUrls,
      });
      setSubmittedCode(result.id ?? t('reportModal.receivedFallback'));
      if (onReported) {
        onReported(
          t('reportModal.reportedToast', {
            targetType: targetNoun,
            name: targetName,
            id: result.id,
          }),
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('reportModal.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Popup
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
          <Flag className="w-4 h-4 text-blue-600" />
          <span>{titleLabel}</span>
        </div>
      }
      size="md"
    >
      {submittedCode ? (
        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 space-y-1">
              <p className="font-bold text-slate-900 text-sm">
                {t('reportModal.successTitle', { code: submittedCode })}
              </p>
              <p>{t('reportModal.successDesc', { targetType: targetNoun, name: targetName })}</p>
              <p className="text-slate-500">{t('reportModal.successEta')}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer"
            >
              {t('reportModal.close')}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
            <span className="text-slate-500">
              {isProduct ? t('reportModal.targetProductLabel') : t('reportModal.targetShopLabel')}
            </span>{' '}
            <strong className="text-slate-900">{targetName}</strong>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              {t('reportModal.reasonLabel')} <span className="text-red-500">*</span>
            </label>
            <div className="space-y-1.5">
              {reasons.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                    selectedReason === r
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r}
                    checked={selectedReason === r}
                    onChange={() => setSelectedReason(r)}
                    className="accent-blue-600"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('reportModal.detailsLabel')} <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('reportModal.detailsPlaceholder')}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('reportModal.evidenceLabel')}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-blue-300 bg-blue-50/40 hover:bg-blue-50 text-xs font-medium text-blue-700 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5" />
                <span>{t('reportModal.uploadEvidence')}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    setEvidenceFiles((prev) => [...prev, ...files].slice(0, 3));
                  }}
                />
              </label>
              {evidenceFiles.map((file, idx) => (
                <span
                  key={`${file.name}-${idx}`}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700"
                >
                  <span className="max-w-[130px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setEvidenceFiles((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetAndClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              {t('reportModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? t('reportModal.submitting') : t('reportModal.submit')}
            </button>
          </div>
        </form>
      )}
    </Popup>
  );
};

export default ReportModal;
