import { cn } from '../../lib/utils';
import { useState } from 'react';
import {
  MessageOutlined,
  SafetyCertificateOutlined,
  StarOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { useSellerSession } from '../../components/seller/SellerSession';
import { EmptyState, PageHeading, Panel } from '../../components/seller/SellerUI';
import { trustLabels } from '../../components/seller/sellerData';

export default function SellerReviewsPage() {
  const user = useSellerSession();
  const [tab, setTab] = useState('all');
  return (
    <div
      className="flex flex-col gap-5.5 min-w-0 [&>[data-seller~=page-stack]]:gap-4 [&_h1]:mt-0 [&_h2]:mt-0 [&_h3]:mt-0 max-[540px]:gap-[17px]"
      data-seller="page-stack"
    >
      <PageHeading
        title="Đánh giá & khách hàng"
        description="Lắng nghe phản hồi, xây dựng niềm tin và phát triển gian hàng."
      />
      <div
        className="grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] gap-5 max-[1050px]:[grid-template-columns:1fr]"
        data-seller="two-columns"
      >
        <Panel title="Đánh giá gian hàng" subtitle="Chất lượng dịch vụ qua góc nhìn người mua">
          <div
            className="flex flex-col items-center p-[15px] gap-[7px] [&>strong]:text-[46px] [&>strong]:text-[#425b88] [&>strong]:tracking-[-2px] [&>div]:flex [&>div]:gap-[5px] [&>div]:text-[#d5e1f6] [&_p]:text-[10px] [&_p]:text-[#8b9fbc] [&_p]:m-0"
            data-seller="reviews-rating"
          >
            <strong>
              —<small>/5</small>
            </strong>
            <div>
              {[1, 2, 3, 4, 5].map((star) => (
                <StarOutlined key={star} className="text-[23px]" aria-hidden="true" />
              ))}
            </div>
            <p>Chưa có dữ liệu đánh giá</p>
          </div>
          {[5, 4, 3, 2, 1].map((star) => (
            <div
              className="flex items-center gap-2.5 text-[10px] text-[#91a0b9] py-2 px-0 [&>div]:h-1.5 [&>div]:bg-[#edf2fa] [&>div]:rounded-[9px] [&>div]:flex-1 [&>div]:overflow-hidden [&_i]:block [&_i]:h-full [&_i]:bg-[#6688eb] [&_i]:rounded-[9px] [&>span:not(.anticon):last-child]:min-w-4 [&>span:not(.anticon):last-child]:text-right"
              data-seller="rating-bar"
              key={star}
            >
              <span>{star} sao</span>
              <div>
                <i className="w-0" />
              </div>
              <span>—</span>
            </div>
          ))}
        </Panel>
        <Panel
          title="Uy tín người bán"
          subtitle="Thông tin từ tài khoản của bạn"
          action={<SafetyCertificateOutlined className="text-[20px]" aria-hidden="true" />}
        >
          <div
            className="[border:1px_solid_#e2eafa] [background:linear-gradient(120deg,_#f3f7ff,_#fafcff)] rounded-[10px] p-5 flex items-center justify-between gap-3 mb-[15px] [&_small]:text-[9px] [&_small]:text-[#899dbd] [&_small]:tracking-[0.7px] [&_strong]:block [&_strong]:text-[26px] [&_strong]:tracking-[-1px] [&_strong]:font-bold [&_strong]:my-1.5 [&_strong]:mx-0 [&_p]:text-[9px] [&_p]:text-[#93a4be] [&_p]:m-0 [&>.anticon]:text-[#81a2ec]!"
            data-seller="wallet-highlight"
          >
            <div>
              <small>ĐIỂM UY TÍN</small>
              <strong>
                {user.reputationScore}
                <small> / 100</small>
              </strong>
              <p>{trustLabels[user.trustLevel] || user.trustLevel}</p>
            </div>
            <StarOutlined className="text-[35px]" aria-hidden="true" />
          </div>
          <div
            className="flex flex-col gap-3.5 [&>div]:flex [&>div]:items-start [&>div]:gap-2.5 [&>div]:p-[13px] [&>div]:[border:1px_solid_#ecf1f9] [&>div]:rounded-[9px] [&>div]:bg-[#f9fbff] [&_.anticon]:w-4.5 [&_.anticon]:shrink-0 [&_.anticon]:text-[#7295e4]! [&_.anticon]:mt-[1px] [&_strong]:text-[11px] [&_strong]:font-[550] [&_p]:text-[10px] [&_p]:text-[#91a0b8] [&_p]:[margin:4px_0_0] [&_p]:leading-[1.8]"
            data-seller="checklist"
          >
            <div>
              <MessageOutlined className="text-[18px]" aria-hidden="true" />
              <span>
                <strong>Phản hồi có trách nhiệm</strong>
                <p>Lắng nghe và chủ động hỗ trợ người mua.</p>
              </span>
            </div>
            <div>
              <TruckOutlined className="text-[18px]" aria-hidden="true" />
              <span>
                <strong>Chất lượng trong từng đơn hàng</strong>
                <p>Đúng mô tả, đúng sản phẩm và đúng thời gian cam kết.</p>
              </span>
            </div>
          </div>
        </Panel>
      </div>
      <Panel title="Phản hồi từ khách hàng">
        <div
          className="flex gap-1 items-center flex-wrap [&_button]:[border:0] [&_button]:bg-transparent [&_button]:text-[#7a89a1] [&_button]:py-2 [&_button]:px-3 [&_button]:rounded-[6px] [&_button]:text-[10px] [&_button]:flex [&_button]:items-center [&_button]:gap-[7px] [&_button]:whitespace-nowrap [&_button.is-active]:text-[#315eea] [&_button.is-active]:bg-[#edf3ff] [&_button.is-active]:font-[650] [&_button>span:not(.anticon)]:text-[9px] [&_button>span:not(.anticon)]:bg-[#edf1f8] [&_button>span:not(.anticon)]:py-0 [&_button>span:not(.anticon)]:px-[5px] [&_button>span:not(.anticon)]:rounded-[4px] [&_button.is-active>span:not(.anticon)]:bg-[#315eea] [&_button.is-active>span:not(.anticon)]:text-[#fff] max-[540px]:[&_button]:py-[7px] max-[540px]:[&_button]:px-2.5 max-[540px]:[&_button]:text-[9px]"
          data-seller="tabs"
        >
          {[
            ['all', 'Tất cả'],
            ['unanswered', 'Chưa phản hồi'],
            ['positive', 'Tích cực'],
            ['improve', 'Cần cải thiện'],
          ].map(([key, label]) => (
            <button
              className={cn(tab === key ? 'is-active' : '')}
              onClick={() => setTab(key)}
              key={key}
            >
              {label}
            </button>
          ))}
        </div>
        <EmptyState
          title="Chưa có phản hồi trong mục này"
          description="Đánh giá và phản hồi khách hàng sẽ hiển thị khi dịch vụ đánh giá được kết nối."
        />
      </Panel>
    </div>
  );
}
