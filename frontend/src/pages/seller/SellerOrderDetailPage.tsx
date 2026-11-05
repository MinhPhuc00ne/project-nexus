import { type ReactElement } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft as ArrowLeftOutlined } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSellerSession } from '../../components/seller/SellerSession';
import { PageHeading, SellerLink } from '../../components/seller/SellerUI';
import SellerLiveOrderDetail from '../../components/seller/SellerLiveOrderDetail';

export default function SellerOrderDetailPage(): ReactElement {
  const { id } = useParams();
  const user = useSellerSession();
  const { token } = useAuth();
  return (
    <div className="space-y-5">
      <PageHeading
        title="Chi tiết đơn hàng"
        actions={
          <SellerLink to="/seller/orders" secondary>
            <ArrowLeftOutlined />
            Danh sách đơn hàng
          </SellerLink>
        }
      />
      <SellerLiveOrderDetail key={`${user.id}:${token}:${id}`} id={id || ''} />
    </div>
  );
}
