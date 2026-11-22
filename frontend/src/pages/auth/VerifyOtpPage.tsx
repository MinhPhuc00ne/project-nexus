import { useTranslation } from 'react-i18next';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function VerifyOtpPage() {
  const { t } = useTranslation('auth');
  return <PagePlaceholder area="Auth" title={t('otp.title')} description={t('otp.subtitle')} />;
}
