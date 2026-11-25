import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';

export default function NotFoundPage() {
  const { t } = useTranslation('guest');
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-16 sm:px-8">
      <Card className="mx-auto w-full max-w-lg border-slate-200 text-center shadow-sm">
        <CardHeader>
          <div className="mb-2">
            <span className="text-6xl font-extrabold text-blue-600">404</span>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">{t('notFound.title')}</CardTitle>
          <CardDescription className="text-slate-500">{t('notFound.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {t('notFound.backHome')}
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
