import { useTranslation } from 'react-i18next';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function TermsPage() {
  const { t } = useTranslation('guest');
  return (
    <PagePlaceholder
      area="Guest"
      title={t('staticPages.termsTitle')}
      description={t('staticPages.termsDesc')}
    />
  );
}
