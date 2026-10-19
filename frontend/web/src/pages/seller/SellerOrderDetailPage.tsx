import { useParams } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useSellerWorkspace } from '../../components/seller/SellerWorkspace';
import {
  EmptyState,
  ModuleNotice,
  PageHeading,
  Panel,
  SellerLink,
} from '../../components/seller/SellerUI';
import { previewOrders } from '../../components/seller/sellerData';
import { OrderDetail, ShippingGuide } from '../../components/seller/SellerOrderPanels';

export default function SellerOrderDetailPage() {
  const { id } = useParams();
  const { preview } = useSellerWorkspace();
  const order = previewOrders.find((item) => item.id === id);
  return (
    <div
      className="flex flex-col gap-5.5 min-w-0 [&>[data-seller~=page-stack]]:gap-4 [&_h1]:mt-0 [&_h2]:mt-0 [&_h3]:mt-0 max-[540px]:gap-[17px]"
      data-seller="page-stack"
    >
      <PageHeading
        title={`Chi tiết đơn hàng ${id || ''}`}
        actions={
          <SellerLink to="/seller/orders" secondary>
            <ArrowLeftOutlined className="text-[15px]" aria-hidden="true" />
            Danh sách đơn hàng
          </SellerLink>
        }
      />
      <ModuleNotice label="Chi tiết đơn hàng" />
      <Panel title="Thông tin đơn hàng">
        {preview && order ? (
          <OrderDetail order={order} />
        ) : (
          <EmptyState
            title="Chưa có thông tin đơn hàng"
            description="Đơn hàng thật chưa được đồng bộ. Mã mẫu chỉ hiển thị khi bật dữ liệu minh họa."
          />
        )}
      </Panel>
      <ShippingGuide />
    </div>
  );
}
