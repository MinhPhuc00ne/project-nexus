import { X, Search, Inbox } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button as ShadcnButton } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';

/*
 * Các khối UI dùng chung, giúp tab có cùng màu, khoảng cách và kiểu nút.
 * text-primary/bg-primary lấy màu từ @theme trong src/index.css.
 * sm:/lg:/xl: là breakpoint Tailwind: class chỉ có hiệu lực từ kích thước đó trở lên.
 */
// Panel là khung card: title/subtitle ở đầu, action ở góc phải, children là nội dung bên trong.
export function Panel({
  title,
  subtitle,
  icon,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={`min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30 sm:p-6 ${className}`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && (
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary">
              {icon}
            </span>
          )}
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

// variant chọn màu nút. ...props chuyển onClick, disabled, type, aria-* xuống thẻ button.
// type mặc định là button để tránh submit form ngoài ý muốn; form cần truyền type="submit".
export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const colors = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-blue-50 text-primary hover:bg-blue-100',
    danger: 'bg-rose-50 text-rose-700 hover:bg-rose-100',
  };
  return (
    <ShadcnButton
      variant={
        variant === 'danger' ? 'destructive' : variant === 'secondary' ? 'secondary' : 'default'
      }
      className={`h-auto min-h-10 rounded-lg px-3.5 py-2.5 text-xs font-semibold focus-visible:outline-blue-600 disabled:cursor-not-allowed ${colors[variant]} ${className}`}
      {...props}
    >
      {children}
    </ShadcnButton>
  );
}

// Badge hiển thị nhãn ngắn hoặc trạng thái; tone đổi màu theo ý nghĩa của trạng thái.
export function Badge({
  children,
  tone = 'blue',
}: {
  children: ReactNode;
  tone?: 'blue' | 'green' | 'red' | 'amber' | 'gray';
}) {
  const colors = {
    blue: 'bg-blue-50 text-primary',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    gray: 'bg-slate-100 text-slate-600',
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold ${colors[tone]}`}
    >
      {children}
    </span>
  );
}

// Controlled input: giá trị nằm ở component cha, mỗi lần gõ gọi onChange để cha cập nhật.
// Component này chỉ hiển thị ô nhập; logic lọc danh sách nằm trong từng tab.
export function SearchInput({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-400">
      <Search size={16} />
      <Input
        className="h-auto w-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-xs text-slate-800 shadow-none outline-none placeholder:text-slate-400 focus-visible:outline-none"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

// Dùng khi không có hồ sơ chờ hoặc không có kết quả khớp bộ lọc/từ khóa tìm kiếm.
export function EmptyState({ text = 'Không có yêu cầu nào trong danh sách.' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center text-sm text-slate-400">
      <Inbox size={32} strokeWidth={1.5} />
      <p>{text}</p>
    </div>
  );
}

// Hộp thoại xem thông tin: đóng bằng nút, click lớp nền hoặc phím Escape khi focus bên trong.
// stopPropagation giữ hộp thoại mở khi người dùng bấm vào phần nội dung.
export function DetailDialog({
  title,
  content,
  onClose,
}: {
  title: string;
  content: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-primary">{title}</h2>
          <button
            autoFocus
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <p className="my-5 whitespace-pre-line text-sm leading-7 text-slate-600">{content}</p>
        <Button onClick={onClose}>Đóng</Button>
      </section>
    </div>
  );
}
