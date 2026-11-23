import { useTranslation } from 'react-i18next';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function PrivacyPage() {
  const { t } = useTranslation('guest');
  return (
    <PagePlaceholder
      area="Guest"
      title={t('staticPages.privacyTitle')}
      description={t('staticPages.privacyDesc')}
    />
  );
}
