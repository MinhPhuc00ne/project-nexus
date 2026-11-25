import { type ReactElement } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft as ArrowLeftOutlined } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSellerSession } from '../../components/seller/SellerSession';
import { PageHeading, SellerLink } from '../../components/seller/SellerUI';
import SellerLiveOrderDetail from '../../components/seller/SellerLiveOrderDetail';

export default function SellerOrderDetailPage(): ReactElement {
  const { t } = useTranslation('seller');
  const { id } = useParams();
  const user = useSellerSession();
  const { token } = useAuth();
  return (
    <div className="space-y-5">
      <PageHeading
        title={t('orders.detailPageTitle')}
        actions={
          <SellerLink to="/seller/orders" secondary>
            <ArrowLeftOutlined />
            {t('orders.backToOrders')}
          </SellerLink>
        }
      />
      <SellerLiveOrderDetail key={`${user.id}:${token}:${id}`} id={id || ''} />
    </div>
  );
}
