import { useState } from 'react';
export function splitChatImages(body: string, attachments: string[] = []) {
  const images = new Set(
    attachments.filter((url) => /^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url)),
  );
  const text = body
    .replace(/https?:\/\/[^\s<>]+/gi, (url) => {
      if (/\.(png|jpe?g|gif|webp|avif|bmp)(\?[^\s]*)?$/i.test(url)) {
        images.add(url);
        return '';
      }
      return url;
    })
    .trim();
  return { text, images: [...images] };
}
function ChatImage({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="support-attachment mt-2 block overflow-hidden rounded-xl"
    >
      {failed ? (
        <span className="block rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 underline">
          Không tải được ảnh · Mở ảnh gốc
        </span>
      ) : (
        <img
          src={url}
          alt="Ảnh đính kèm trong hội thoại"
          loading="lazy"
          className="max-h-64 max-w-full rounded-xl object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </a>
  );
}
export default function ChatMessageContent({
  body,
  attachments,
}: {
  body: string;
  attachments?: string[];
}) {
  const { text, images } = splitChatImages(body, attachments);
  return (
    <>
      {text && <p className="whitespace-pre-wrap break-words">{text}</p>}
      {images.map((url) => (
        <ChatImage key={url} url={url} />
      ))}
    </>
  );
}
