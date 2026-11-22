import { useTranslation } from 'react-i18next';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function AboutPage() {
  const { t } = useTranslation('guest');
  return (
    <PagePlaceholder
      area="Guest"
      title={t('staticPages.aboutTitle')}
      description={t('staticPages.aboutDesc')}
    />
  );
}
