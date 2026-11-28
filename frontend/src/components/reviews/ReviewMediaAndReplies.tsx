import { useCallback, useState, type FormEvent } from 'react';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../ToastNotification';
import ReviewMediaPicker from './ReviewMediaPicker';
import {
  createReviewReplyApi,
  getReviewRepliesApi,
  validateReviewMediaFiles,
  type ReviewMediaItem,
  type ReviewReplyItem,
} from '@/features/reviews/services/reviews.service';

interface ReviewMediaAndRepliesProps {
  reviewId: string;
  kind: 'product' | 'shop';
  media?: ReviewMediaItem[];
  mediaUrls?: string[];
  sellerReply?: string | null;
  canReply: boolean;
  formatDate: (value: string) => string;
}

function isVideoMedia(url: string, mediaType?: string): boolean {
  if (mediaType === 'VIDEO') return true;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.webm');
}

function MediaGallery({ media, mediaUrls }: { media?: ReviewMediaItem[]; mediaUrls?: string[] }) {
  const items: Array<{ key: string; url: string; isVideo: boolean }> =
    media && media.length > 0
      ? media.map((m) => ({ key: m.id, url: m.url, isVideo: isVideoMedia(m.url, m.mediaType) }))
      : (mediaUrls ?? []).map((url, idx) => ({
          key: `${url}-${idx}`,
          url,
          isVideo: isVideoMedia(url),
        }));

  if (items.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
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
            <img src={item.url} alt="" loading="lazy" className="h-16 w-16 object-cover" />
          </a>
        ),
      )}
    </div>
  );
}

function RepliesList({
  loading,
  loadError,
  replies,
  sellerReply,
  page,
  totalPages,
  formatDate,
  onLoadMore,
}: {
  loading: boolean;
  loadError: string | null;
  replies: ReviewReplyItem[];
  sellerReply?: string | null;
  page: number;
  totalPages: number;
  formatDate: (value: string) => string;
  onLoadMore: () => void;
}) {
  const { t } = useTranslation('guest');

  if (loading && replies.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        {t('product.reviewReplies.loading')}
      </p>
    );
  }
  if (loadError) {
    return <p className="text-xs text-rose-600">{loadError}</p>;
  }
  if (replies.length === 0) {
    if (sellerReply) {
      return (
        <div className="rounded-lg border border-blue-100 bg-white p-2.5 text-xs">
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
            {t('product.reviewReplies.sellerBadge')}
          </span>
          <p className="mt-1 text-slate-700">{sellerReply}</p>
        </div>
      );
    }
    return <p className="text-xs text-slate-500">{t('product.reviewReplies.empty')}</p>;
  }

  return (
    <div className="space-y-2">
      {replies.map((reply) => {
        const isSeller = reply.authorRole === 'SELLER';
        return (
          <div
            key={reply.id}
            className={`rounded-lg border p-2.5 text-xs ${
              isSeller ? 'border-blue-100 bg-white' : 'border-slate-200 bg-white/90'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <strong className="text-slate-800">{reply.author.fullName}</strong>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    isSeller ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isSeller
                    ? t('product.reviewReplies.sellerBadge')
                    : t('product.reviewReplies.buyerBadge')}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">{formatDate(reply.createdAt)}</span>
            </div>
            <p className="mt-1 whitespace-pre-line text-slate-700">{reply.content}</p>
            <MediaGallery media={reply.media} />
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
          {loading ? t('product.reviewReplies.loading') : t('product.reviewReplies.loadMore')}
        </button>
      )}
    </div>
  );
}

/**
 * Renders attached review media and an expandable 2-way Buyer/Seller reply thread.
 */
export default function ReviewMediaAndReplies({
  reviewId,
  kind,
  media,
  mediaUrls,
  sellerReply,
  canReply,
  formatDate,
}: ReviewMediaAndRepliesProps) {
  const { t } = useTranslation('guest');
  const toast = useToast();

  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [replies, setReplies] = useState<ReviewReplyItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
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
        setLoadError(err instanceof Error ? err.message : t('product.reviewReplies.loadError'));
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canReply || submitting) return;

    const trimmed = content.trim();
    if (!trimmed) {
      setFormError(t('product.reviewReplies.contentRequired'));
      return;
    }
    const mediaErr = validateReviewMediaFiles(files);
    if (mediaErr) {
      setFormError(t(`product.reviewMediaErrors.${mediaErr}`));
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const created = await createReviewReplyApi(kind, reviewId, { content: trimmed, files });
      setReplies((prev) => [...prev, created]);
      setLoaded(true);
      setContent('');
      setFiles([]);
      toast.success(t('product.reviewReplies.sendSuccess'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('product.reviewReplies.sendError');
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2">
      <MediaGallery media={media} mediaUrls={mediaUrls} />

      {sellerReply && !expanded && (
        <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-xs text-slate-700">
          <span className="font-semibold text-blue-700">
            {t('product.reviewReplies.sellerBadge')}:{' '}
          </span>
          <span>{sellerReply}</span>
        </div>
      )}

      <div className="mt-2">
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          <MessageSquare className="h-3 w-3" aria-hidden="true" />
          {expanded
            ? t('product.reviewReplies.toggleClose')
            : t('product.reviewReplies.toggleOpen')}
        </button>
      </div>

      {expanded && (
        <div className="mt-2.5 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <RepliesList
            loading={loading}
            loadError={loadError}
            replies={replies}
            sellerReply={sellerReply}
            page={page}
            totalPages={totalPages}
            formatDate={formatDate}
            onLoadMore={() => void fetchReplies(page + 1, true)}
          />

          {canReply && (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2 pt-1">
              <textarea
                rows={2}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('product.reviewReplies.placeholder')}
                maxLength={2000}
                disabled={submitting}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
              />
              <ReviewMediaPicker files={files} onChange={setFiles} disabled={submitting} />
              {formError && <p className="text-xs text-rose-600">{formError}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {submitting
                    ? t('product.reviewReplies.sending')
                    : t('product.reviewReplies.send')}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
