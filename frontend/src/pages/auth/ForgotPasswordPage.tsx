import { useTranslation } from 'react-i18next';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  return (
    <PagePlaceholder
      area="Auth"
      title={t('forgotPassword.title')}
      description={t('forgotPassword.subtitle')}
    />
  );
}
