import { useCallback, useId, useState, type ChangeEvent, type FormEvent } from 'react';
import { ImagePlus, Loader2, MessageSquare, Send, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../ToastNotification';
import {
  createReviewReplyApi,
  getReviewRepliesApi,
  validateReviewReplyMedia,
  type ReviewMediaItem,
  type ReviewReplyItem,
} from '@/features/reviews/services/reviews.service';

interface SellerReviewReplyThreadProps {
  reviewId: string;
  kind: 'product' | 'shop';
  legacyReply?: string | null;
  legacyRepliedAt?: string | null;
  media?: ReviewMediaItem[];
  mediaUrls?: string[];
  formatDate: (value: string) => string;
  canReply?: boolean;
}

function isVideoMedia(url: string, mediaType?: string): boolean {
  if (mediaType === 'VIDEO') return true;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.webm');
}

function ReviewMediaGallery({
  media,
  mediaUrls,
}: {
  media?: ReviewMediaItem[];
  mediaUrls?: string[];
}) {
  const items: Array<{ key: string; url: string; isVideo: boolean }> =
    media && media.length > 0
      ? media.map((m) => ({
          key: m.id,
          url: m.url,
          isVideo: isVideoMedia(m.url, m.mediaType),
        }))
      : (mediaUrls ?? []).map((url, idx) => ({
          key: `${url}-${idx}`,
          url,
          isVideo: isVideoMedia(url),
        }));

  if (items.length === 0) return null;

  return (
    <div className="mt-2.5 flex flex-wrap gap-2">
      {items.map((item) =>
        item.isVideo ? (
          <video
            key={item.key}
            src={item.url}
            controls
            preload="metadata"
            className="h-24 w-36 rounded-lg border border-slate-200 bg-black object-cover"
          />
        ) : (
          <a
            key={item.key}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-lg border border-slate-200 transition hover:opacity-90"
          >
            <img src={item.url} alt="" loading="lazy" className="h-20 w-20 object-cover" />
          </a>
        ),
      )}
    </div>
  );
}

function ReplyListSection({
  loading,
  loadError,
  replies,
  legacyReply,
  legacyRepliedAt,
  page,
  totalPages,
  formatDate,
  onLoadMore,
}: {
  loading: boolean;
  loadError: string | null;
  replies: ReviewReplyItem[];
  legacyReply?: string | null;
  legacyRepliedAt?: string | null;
  page: number;
  totalPages: number;
  formatDate: (value: string) => string;
  onLoadMore: () => void;
}) {
  const { t } = useTranslation('seller');

  if (loading && replies.length === 0) {
    return (
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        {t('reviews.replies.loading')}
      </p>
    );
  }
  if (loadError) {
    return <p className="text-xs text-red-600">{loadError}</p>;
  }
  if (replies.length === 0) {
    if (legacyReply) {
      return (
        <div className="rounded-lg border border-blue-100 bg-white p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
              {t('reviews.replies.sellerBadge')}
            </span>
            {legacyRepliedAt && (
              <span className="text-[11px] text-slate-400">{formatDate(legacyRepliedAt)}</span>
            )}
          </div>
          <p className="mt-1.5 text-slate-700">{legacyReply}</p>
        </div>
      );
    }
    return <p className="text-xs text-slate-500">{t('reviews.replies.empty')}</p>;
  }

  return (
    <div className="space-y-2.5">
      {replies.map((reply) => {
        const isSeller = reply.authorRole === 'SELLER';
        return (
          <div
            key={reply.id}
            className={`rounded-lg border p-3 text-xs ${
              isSeller ? 'border-blue-100 bg-white' : 'border-slate-200 bg-white/90'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <strong className="text-slate-800">{reply.author.fullName}</strong>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    isSeller ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isSeller ? t('reviews.replies.sellerBadge') : t('reviews.replies.buyerBadge')}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">{formatDate(reply.createdAt)}</span>
            </div>
            <p className="mt-1.5 whitespace-pre-line text-slate-700">{reply.content}</p>
            <ReviewMediaGallery media={reply.media} />
          </div>
        );
      })}

      {page < totalPages && (
        <button
          type="button"
          disabled={loading}
          onClick={onLoadMore}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          {loading ? t('reviews.replies.loading') : t('reviews.replies.loadMore')}
        </button>
      )}
    </div>
  );
}

/**
 * Displays attached review media and an expandable 2-way Buyer/Seller reply thread
 * with image/video upload support.
 */
export default function SellerReviewReplyThread({
  reviewId,
  kind,
  legacyReply,
  legacyRepliedAt,
  media,
  mediaUrls,
  formatDate,
  canReply = true,
}: SellerReviewReplyThreadProps) {
  const { t } = useTranslation('seller');
  const toast = useToast();
  const fileInputId = useId();

  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [replies, setReplies] = useState<ReviewReplyItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchReplies = useCallback(
    async (targetPage: number, append: boolean) => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await getReviewRepliesApi(kind, reviewId, targetPage, 20);
        setReplies((prev) => (append ? [...prev, ...res.items] : res.items));
        setPage(res.page);
        setTotalPages(Math.max(1, res.totalPages || 1));
        setLoaded(true);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : t('reviews.replies.loadError'));
      } finally {
        setLoading(false);
      }
    },
    [kind, reviewId, t],
  );

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded && !loading) {
      void fetchReplies(1, false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (picked.length === 0) return;

    const merged = [...selectedFiles, ...picked];
    const validationError = validateReviewReplyMedia(merged);
    if (validationError) {
      setFormError(t(`reviews.replies.mediaErrors.${validationError}`));
      return;
    }

    setFormError(null);
    setSelectedFiles(merged);
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canReply || submitting) return;

    const trimmed = content.trim();
    if (!trimmed) {
      setFormError(t('reviews.replies.contentRequired'));
      return;
    }

    const mediaError = validateReviewReplyMedia(selectedFiles);
    if (mediaError) {
      setFormError(t(`reviews.replies.mediaErrors.${mediaError}`));
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const created = await createReviewReplyApi(kind, reviewId, {
        content: trimmed,
        files: selectedFiles,
      });
      setReplies((prev) => [...prev, created]);
      setLoaded(true);
      setContent('');
      setSelectedFiles([]);
      toast.success(t('reviews.replies.sendSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('reviews.replies.sendError');
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2">
      <ReviewMediaGallery media={media} mediaUrls={mediaUrls} />

      {legacyReply && !expanded && (
        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-xs text-slate-700">
          <span className="font-semibold text-blue-700">{t('reviews.replies.legacyReply')}: </span>
          <span>{legacyReply}</span>
        </div>
      )}

      <div className="mt-3">
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          {expanded ? t('reviews.replies.toggleClose') : t('reviews.replies.toggleOpen')}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <ReplyListSection
            loading={loading}
            loadError={loadError}
            replies={replies}
            legacyReply={legacyReply}
            legacyRepliedAt={legacyRepliedAt}
            page={page}
            totalPages={totalPages}
            formatDate={formatDate}
            onLoadMore={() => void fetchReplies(page + 1, true)}
          />

          {canReply && (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2.5 pt-1">
              <textarea
                rows={2}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('reviews.replies.placeholder')}
                maxLength={2000}
                disabled={submitting}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none disabled:bg-slate-100"
              />

              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <span
                      key={`${file.name}-${file.size}-${index}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                    >
                      <span className="max-w-[160px] truncate">{file.name}</span>
                      <button
                        type="button"
                        aria-label={t('reviews.replies.removeFile', { name: file.name })}
                        onClick={() => handleRemoveFile(index)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {formError && <p className="text-xs text-red-600">{formError}</p>}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor={fileInputId}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                  >
                    <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('reviews.replies.attachMedia')}
                  </label>
                  <input
                    id={fileInputId}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,.mp4,.mov"
                    onChange={handleFileChange}
                    disabled={submitting}
                    className="sr-only"
                  />
                  <span className="text-[11px] text-slate-400">
                    {t('reviews.replies.mediaHint')}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {submitting ? t('reviews.replies.sending') : t('reviews.replies.send')}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
