import { cn } from '../../lib/utils';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightOutlined,
  FileTextOutlined,
  MessageOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { EmptyState, PageHeading, Panel, PolicyCards } from '../../components/seller/SellerUI';

export default function SellerDisputesPage() {
  const [tab, setTab] = useState('open');
  const [query, setQuery] = useState('');
  return (
    <div
      className="flex flex-col gap-5.5 min-w-0 [&>[data-seller~=page-stack]]:gap-4 [&_h1]:mt-0 [&_h2]:mt-0 [&_h3]:mt-0 max-[540px]:gap-[17px]"
      data-seller="page-stack"
    >
      <PageHeading
        title="Khiếu nại & hỗ trợ"
        description="Theo dõi vấn đề phát sinh và phối hợp xử lý cùng đội ngũ NEXUS."
      />
      <div
        className="grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] gap-5 max-[1050px]:[grid-template-columns:1fr]"
        data-seller="two-columns"
      >
        <Panel title="Hồ sơ cần xử lý" subtitle="Tập trung bằng chứng, theo dõi tiến trình">
          <div
            className="flex gap-1 items-center flex-wrap [&_button]:[border:0] [&_button]:bg-transparent [&_button]:text-[#7a89a1] [&_button]:py-2 [&_button]:px-3 [&_button]:rounded-[6px] [&_button]:text-[10px] [&_button]:flex [&_button]:items-center [&_button]:gap-[7px] [&_button]:whitespace-nowrap [&_button.is-active]:text-[#315eea] [&_button.is-active]:bg-[#edf3ff] [&_button.is-active]:font-[650] [&_button>span:not(.anticon)]:text-[9px] [&_button>span:not(.anticon)]:bg-[#edf1f8] [&_button>span:not(.anticon)]:py-0 [&_button>span:not(.anticon)]:px-[5px] [&_button>span:not(.anticon)]:rounded-[4px] [&_button.is-active>span:not(.anticon)]:bg-[#315eea] [&_button.is-active>span:not(.anticon)]:text-[#fff] max-[540px]:[&_button]:py-[7px] max-[540px]:[&_button]:px-2.5 max-[540px]:[&_button]:text-[9px]"
            data-seller="tabs"
          >
            {[
              ['open', 'Đang xử lý'],
              ['resolved', 'Đã giải quyết'],
              ['all', 'Tất cả'],
            ].map(([key, label]) => (
              <button
                className={cn(tab === key ? 'is-active' : '')}
                key={key}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <label
            className="flex items-center gap-2 [border:1px_solid_#e5ebf4] rounded-[7px] py-2 px-2.5 min-w-[160px] flex-1 text-[#8da0bf] bg-[#f9fbff] [&_input]:[border:0] [&_input]:bg-transparent [&_input]:[outline:none] [&_input]:w-full [&_input]:min-w-0 [&_input]:text-[10px] [&_input::placeholder]:text-[#a0aec3] mt-4 max-w-none"
            data-seller="search-field"
          >
            <SearchOutlined className="text-[15px]" aria-hidden="true" />
            <input
              aria-label="Tìm khiếu nại"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Mã đơn hàng hoặc nội dung khiếu nại..."
            />
          </label>
          <EmptyState
            title="Chưa có dữ liệu khiếu nại"
            description="Hồ sơ tranh chấp sẽ xuất hiện khi hệ thống hỗ trợ được kết nối."
          />
        </Panel>
        <Panel title="Chuẩn bị hồ sơ hỗ trợ" subtitle="Thông tin đầy đủ giúp xử lý nhanh hơn">
          <div
            className="flex flex-col gap-3.5 [&>div]:flex [&>div]:items-start [&>div]:gap-2.5 [&>div]:p-[13px] [&>div]:[border:1px_solid_#ecf1f9] [&>div]:rounded-[9px] [&>div]:bg-[#f9fbff] [&_.anticon]:w-4.5 [&_.anticon]:shrink-0 [&_.anticon]:text-[#7295e4]! [&_.anticon]:mt-[1px] [&_strong]:text-[11px] [&_strong]:font-[550] [&_p]:text-[10px] [&_p]:text-[#91a0b8] [&_p]:[margin:4px_0_0] [&_p]:leading-[1.8]"
            data-seller="checklist"
          >
            <div>
              <FileTextOutlined className="text-[18px]" aria-hidden="true" />
              <span>
                <strong>Thông tin đơn hàng</strong>
                <p>Mã đơn, sản phẩm và mô tả rõ vấn đề cần hỗ trợ.</p>
              </span>
            </div>
            <div>
              <SafetyCertificateOutlined className="text-[18px]" aria-hidden="true" />
              <span>
                <strong>Bằng chứng liên quan</strong>
                <p>Ảnh, video đồng kiểm và biên bản bàn giao.</p>
              </span>
            </div>
            <div>
              <MessageOutlined className="text-[18px]" aria-hidden="true" />
              <span>
                <strong>Lịch sử trao đổi</strong>
                <p>Lưu lại nội dung trao đổi để đối chiếu khi cần.</p>
              </span>
            </div>
          </div>
          <Link
            className="inline-flex items-center gap-1.5 p-0 [border:0] bg-transparent text-[#315eea] text-[10px] font-[550]"
            data-seller="text-button"
            to="/seller/orders"
          >
            Kiểm tra đơn hàng <ArrowRightOutlined className="text-[14px]" aria-hidden="true" />
          </Link>
        </Panel>
      </div>
      <PolicyCards />
    </div>
  );
}
