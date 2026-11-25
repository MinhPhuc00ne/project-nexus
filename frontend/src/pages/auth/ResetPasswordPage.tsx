import { useTranslation } from 'react-i18next';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  return (
    <PagePlaceholder
      area="Auth"
      title={t('resetPassword.title')}
      description={t('resetPassword.subtitle')}
    />
  );
}
