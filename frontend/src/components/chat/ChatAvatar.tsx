import { useState } from 'react';
import { useTranslation } from 'react-i18next';
interface Props {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}
export default function ChatAvatar({ src, name, size = 40, className = '' }: Props) {
  const { t } = useTranslation('common');
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => Array.from(word)[0])
      .slice(-2)
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-semibold text-blue-700 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
    >
      {src && src !== failedSrc ? (
        <img
          src={src}
          alt={t('chat.avatarAlt', { name })}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span role="img" aria-label={t('chat.avatarAlt', { name })}>
          {initials}
        </span>
      )}
    </span>
  );
}
