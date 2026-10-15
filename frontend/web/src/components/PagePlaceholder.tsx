import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';

export interface PagePlaceholderProps {
  area: 'Admin' | 'Buyer' | 'Seller' | 'Staff' | 'Guest' | 'Auth' | string;
  title: string;
  description?: string;
}

export default function PagePlaceholder({
  area,
  title,
  description = 'Trang này đang được phát triển.',
}: PagePlaceholderProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-8">
      <Card className="mx-auto w-full max-w-4xl border-slate-200 shadow-sm">
        <CardHeader>
          <div className="mb-1">
            <span className="inline-block rounded bg-blue-50 px-2.5 py-0.5 text-xs font-semibold uppercase text-blue-700">
              {area}
            </span>
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">{title}</CardTitle>
          <CardDescription className="text-sm text-slate-500">{description}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
