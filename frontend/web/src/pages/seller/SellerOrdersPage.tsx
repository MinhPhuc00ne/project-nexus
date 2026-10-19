import { cn } from '../../lib/utils';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DownloadOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  PrinterOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  ControlOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import Popup from '../../components/Popup';
import { useSellerWorkspace } from '../../components/seller/SellerWorkspace';
import {
  Badge,
  EmptyState,
  ModuleNotice,
  PageHeading,
  Panel,
  SellerButton,
  SellerLink,
  exportCsv,
} from '../../components/seller/SellerUI';
import {
  money,
  orderStatuses,
  previewOrders,
  type SellerOrder,
} from '../../components/seller/sellerData';
import { OrderDetail, ShippingGuide } from '../../components/seller/SellerOrderPanels';

export default function SellerOrdersPage() {
  const { preview, notify } = useSellerWorkspace();
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<SellerOrder | null>(null);
  const [warehouse, setWarehouse] = useState(false);
  const [page, setPage] = useState(1);
  const orders = preview ? previewOrders : [];
  const filtered = orders.filter(
    (order) =>
      (status === 'all' || status === order.status) &&
      (type === 'all' || type === order.type) &&
      `${order.id} ${order.buyer} ${order.product}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const visible = filtered.slice((page - 1) * 3, page * 3);
  const allSelected = visible.length > 0 && visible.every((order) => selected.includes(order.id));
  const changeStatus = (next: string) => {
    setStatus(next);
    setPage(1);
    setSelected([]);
  };
  const exportOrders = () => {
    if (!filtered.length) {
      notify('Chưa có đơn hàng để xuất.');
      return;
    }
    exportCsv('don-hang-minh-hoa.csv', [
      ['Dữ liệu minh họa'],
      ['Mã đơn', 'Người mua', 'Sản phẩm', 'Giá trị', 'Trạng thái'],
      ...filtered.map((order) => [
        order.id,
        order.buyer,
        order.product,
        order.price,
        orderStatuses[order.status],
      ]),
    ]);
  };
  return (
    <div
      className="flex flex-col gap-5.5 min-w-0 [&>[data-seller~=page-stack]]:gap-4 [&_h1]:mt-0 [&_h2]:mt-0 [&_h3]:mt-0 max-[540px]:gap-[17px]"
      data-seller="page-stack"
    >
      <PageHeading
        title="Đơn hàng & vận chuyển GHN"
        description="Quản lý đơn hàng từ xác nhận đến bàn giao và giao thành công."
        actions={
          <SellerButton secondary onClick={() => setWarehouse(true)}>
            <ControlOutlined className="text-[16px]" aria-hidden="true" />
            Cấu hình kho GHN
          </SellerButton>
        }
      />
      <ModuleNotice label="Đơn hàng và vận chuyển" />
      <div
        className="flex gap-1 items-center flex-wrap [&_button]:[border:0] [&_button]:bg-transparent [&_button]:text-[#7a89a1] [&_button]:rounded-[6px] [&_button]:text-[10px] [&_button]:flex [&_button]:items-center [&_button]:gap-[7px] [&_button]:whitespace-nowrap [&_button.is-active]:text-[#315eea] [&_button.is-active]:bg-[#edf3ff] [&_button.is-active]:font-[650] [&_button>span:not(.anticon)]:text-[9px] [&_button>span:not(.anticon)]:bg-[#edf1f8] [&_button>span:not(.anticon)]:py-0 [&_button>span:not(.anticon)]:px-[5px] [&_button>span:not(.anticon)]:rounded-[4px] [&_button.is-active>span:not(.anticon)]:bg-[#315eea] [&_button.is-active>span:not(.anticon)]:text-[#fff] max-[540px]:[&_button]:py-[7px] max-[540px]:[&_button]:px-2.5 max-[540px]:[&_button]:text-[9px] bg-white [border:1px_solid_#e5ebf4] rounded-[10px] p-2.5 [&_button]:py-[9px] [&_button]:px-3 max-[540px]:flex-nowrap max-[540px]:overflow-x-auto max-[540px]:p-2"
        data-seller="tabs order-tabs"
      >
        {[['all', 'Tất cả'], ...Object.entries(orderStatuses)].map(([key, label]) => (
          <button
            key={key}
            className={cn(status === key ? 'is-active' : '')}
            onClick={() => changeStatus(key)}
          >
            {label}
            <span>{orders.filter((order) => key === 'all' || order.status === key).length}</span>
          </button>
        ))}
      </div>
      <div
        className="flex items-center flex-wrap gap-2.5 bg-white [border:1px_solid_#e5ebf4] rounded-[10px] p-[13px] [&_select]:[border:1px_solid_#e5ebf4] [&_select]:rounded-[7px] [&_select]:bg-[#f9fbff] [&_select]:py-2 [&_select]:px-2.5 [&_select]:text-[#7384a1] [&_select]:text-[10px] [&_select]:min-h-8.5 [&_select]:max-w-full max-[540px]:p-[11px] max-[540px]:gap-2 max-[540px]:[&>[data-seller~=search-field]]:max-w-[none] max-[540px]:[&>[data-seller~=search-field]]:min-w-full max-[540px]:[&>[data-seller~=button]]:flex-1 max-[540px]:[&>[data-seller~=button]]:py-2 max-[540px]:[&>[data-seller~=button]]:px-2.5 max-[540px]:[&_select]:flex-1"
        data-seller="toolbar"
      >
        <label
          className="flex items-center gap-2 [border:1px_solid_#e5ebf4] rounded-[7px] py-2 px-2.5 min-w-[160px] flex-1 max-w-[330px] text-[#8da0bf] bg-[#f9fbff] [&_input]:[border:0] [&_input]:bg-transparent [&_input]:[outline:none] [&_input]:w-full [&_input]:min-w-0 [&_input]:text-[10px] [&_input::placeholder]:text-[#a0aec3]"
          data-seller="search-field"
        >
          <SearchOutlined className="text-[16px]" aria-hidden="true" />
          <input
            aria-label="Tìm đơn hàng"
            placeholder="Mã đơn, tên khách hàng, sản phẩm..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <select
          aria-label="Loại đơn hàng"
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">Tất cả hình thức</option>
          <option value="auction">Đấu giá 3D</option>
          <option value="retail">Mua ngay</option>
        </select>
        <div className="flex-1 max-[540px]:hidden" data-seller="toolbar-spacer" />
        <SellerButton secondary onClick={exportOrders}>
          <DownloadOutlined className="text-[15px]" aria-hidden="true" />
          Xuất CSV
        </SellerButton>
        <SellerButton
          disabled={!preview || selected.length === 0}
          onClick={() => notify('In vận đơn GHN chưa được hỗ trợ. Không có vận đơn thật được tạo.')}
        >
          <PrinterOutlined className="text-[15px]" aria-hidden="true" />
          In phiếu ({preview ? selected.length : 0})
        </SellerButton>
      </div>
      <div
        className="grid [grid-template-columns:minmax(0,_2.4fr)_minmax(240px,_1fr)] gap-5 [align-items:start] max-[1250px]:[grid-template-columns:minmax(0,_1fr)_250px] max-[1050px]:[grid-template-columns:1fr] max-[1050px]:[&>aside]:grid max-[1050px]:[&>aside]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[1050px]:[&>aside>[data-seller~=panel]:last-child]:[grid-column:1/-1] max-[540px]:[&>aside]:flex"
        data-seller="orders-grid"
      >
        <div
          className="flex flex-col gap-5.5 min-w-0 [&>[data-seller~=page-stack]]:gap-4 [&_h1]:mt-0 [&_h2]:mt-0 [&_h3]:mt-0 max-[540px]:gap-[17px]"
          data-seller="page-stack"
        >
          <section
            className="[border:1px_solid_#e5ebf4] rounded-[12px] bg-white min-w-0 [&>[data-seller~=text-button]]:mt-4.5 [&>[data-seller~=button]]:mt-4.5 min-[1600px]:p-[25px] max-[1050px]:p-4.5 p-0 overflow-hidden max-[760px]:p-0 max-[540px]:p-0"
            data-seller="panel table-panel"
          >
            <div className="overflow-x-auto" data-seller="table-scroll">
              <table
                className="w-full border-collapse text-left whitespace-normal text-[10px] min-w-[620px] [&_th]:text-[9px] [&_th]:tracking-[0.4px] [&_th]:font-semibold [&_th]:text-[#8b9cba] [&_th]:bg-[#f8faff] [&_th]:[border-bottom:1px_solid_#e5ebf4] [&_th]:py-[15px] [&_th]:px-[13px] [&_td]:py-4.5 [&_td]:px-[13px] [&_td]:[border-bottom:1px_solid_#eef2f8] [&_td]:[vertical-align:middle] [&_td]:text-[#5d6e8b] [&_td>small]:flex [&_td>small]:items-center [&_td>small]:gap-[3px] [&_td>small]:text-[9px] [&_td>small]:text-[#9aaac0] [&_td>small]:my-1.5 [&_td>small]:mx-0 [&_td>strong]:block [&_td>strong]:text-[12px] [&_td>strong]:text-[#293d61] [&_td>strong]:mb-1.5 [&_td>span:not(.anticon):not([data-seller~=badge])]:block [&_td>span:not(.anticon):not([data-seller~=badge])]:my-1 [&_td>span:not(.anticon):not([data-seller~=badge])]:mx-0 [&_td>[data-seller~=badge]]:mt-[5px] [&_input[type='checkbox']]:w-[13px] [&_input[type='checkbox']]:h-[13px] [&_input[type='checkbox']]:[accent-color:#315eea]"
                data-seller="table"
              >
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="Chọn tất cả đơn trên trang"
                        disabled={!visible.length}
                        checked={allSelected}
                        onChange={(event) =>
                          setSelected(
                            event.target.checked
                              ? [...new Set([...selected, ...visible.map((order) => order.id)])]
                              : selected.filter((id) => !visible.some((order) => order.id === id)),
                          )
                        }
                      />
                    </th>
                    <th>MÃ ĐƠN & NGƯỜI MUA</th>
                    <th>SẢN PHẨM</th>
                    <th>THANH TOÁN & KÝ QUỸ</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Chọn đơn ${order.id}`}
                          checked={selected.includes(order.id)}
                          onChange={(event) =>
                            setSelected(
                              event.target.checked
                                ? [...selected, order.id]
                                : selected.filter((id) => id !== order.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        <Link
                          className="font-[650] text-[#2b3c5e]"
                          data-seller="order-id"
                          to={`/seller/orders/${order.id}`}
                        >
                          #{order.id}
                        </Link>
                        <small>
                          <ClockCircleOutlined className="text-[12px]" aria-hidden="true" />
                          {order.time}
                        </small>
                        <span>{order.buyer}</span>
                        <Badge tone={order.status === 'packing' ? 'amber' : 'gray'}>
                          {orderStatuses[order.status]}
                        </Badge>
                      </td>
                      <td>
                        <div
                          className="flex items-center gap-2.5 min-w-[185px] [&>img]:w-12 [&>img]:h-[55px] [&>img]:object-contain [&>img]:bg-[#f7f9fc] [&>img]:rounded-[7px] [&>img]:shrink-0 [&_strong]:text-[10px] [&_strong]:text-[#344665] [&_strong]:block [&_strong]:mt-[5px] [&_strong]:font-[550] [&_small]:block [&_small]:text-[9px] [&_small]:text-[#a0aec2] [&_small]:mt-1"
                          data-seller="table-product"
                        >
                          <img src={order.image} alt="" />
                          <div>
                            <Badge tone={order.type === 'auction' ? 'blue' : 'gray'}>
                              {order.type === 'auction' ? 'Đấu giá 3D' : 'Mua ngay'}
                            </Badge>
                            <strong>{order.product}</strong>
                            <small>Số lượng: 01</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{money(order.price)}</strong>
                        <Badge tone="green">
                          <SafetyCertificateOutlined className="text-[11px]" aria-hidden="true" />
                          {order.payment}
                        </Badge>
                      </td>
                      <td>
                        <button
                          className="inline-flex items-center gap-1.5 p-0 [border:0] bg-transparent text-[#315eea] text-[10px] font-[550]"
                          data-seller="text-button"
                          onClick={() => setDetail(order)}
                        >
                          Chi tiết <ArrowRightOutlined className="text-[13px]" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!visible.length && (
              <EmptyState
                title={orders.length ? 'Không tìm thấy đơn phù hợp' : 'Chưa có dữ liệu đơn hàng'}
                description={
                  orders.length
                    ? 'Thử thay đổi từ khóa hoặc trạng thái lọc.'
                    : 'Các đơn hàng và thông tin GHN sẽ hiển thị tại đây khi được kết nối.'
                }
              />
            )}
            <div
              className="flex items-center justify-between gap-3 py-[15px] px-4 text-[10px] text-[#8a9bb6] [&>div]:flex [&>div]:items-center [&>div]:gap-2 [&_button]:bg-white [&_button]:[border:1px_solid_#e5ebf4] [&_button]:rounded-[6px] [&_button]:w-[25px] [&_button]:h-[25px] [&_button]:text-[#718bb9] [&>div>span:not(.anticon)]:bg-[#315eea] [&>div>span:not(.anticon)]:rounded-[5px] [&>div>span:not(.anticon)]:py-[3px] [&>div>span:not(.anticon)]:px-[9px] [&>div>span:not(.anticon)]:text-[#fff]"
              data-seller="pagination"
            >
              <span>
                {filtered.length} đơn hàng {preview && 'minh họa'} · Trang {page}/
                {Math.max(1, Math.ceil(filtered.length / 3))}
              </span>
              <div>
                <button
                  aria-label="Trang trước"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  ‹
                </button>
                <span>{page}</span>
                <button
                  aria-label="Trang sau"
                  disabled={page >= Math.ceil(filtered.length / 3)}
                  onClick={() => setPage(page + 1)}
                >
                  ›
                </button>
              </div>
            </div>
          </section>
          <div
            className="flex gap-2.5 items-center p-[15px] [border:1px_solid_#e3ebfa] bg-[#f4f8ff] rounded-[9px] text-[#8194b1] text-[11px] leading-[1.8] [&>.anticon]:shrink-0 [&>.anticon]:text-[#7194db]! [&>[data-seller~=text-button]]:ml-auto [&>[data-seller~=text-button]]:whitespace-nowrap max-[540px]:text-[10px] max-[540px]:flex-wrap max-[540px]:[&>span:not(.anticon)]:flex-1 max-[540px]:[&_[data-seller~=text-button]]:ml-[27px]"
            data-seller="info-note"
          >
            <EnvironmentOutlined className="text-[17px]" aria-hidden="true" />
            <span>Chưa có kho GHN được liên kết với gian hàng.</span>
            <button
              className="inline-flex items-center gap-1.5 p-0 [border:0] bg-transparent text-[#315eea] text-[10px] font-[550]"
              data-seller="text-button"
              onClick={() => setWarehouse(true)}
            >
              Xem cấu hình
            </button>
          </div>
        </div>
        <aside
          className="flex flex-col gap-5.5 min-w-0 [&>[data-seller~=page-stack]]:gap-4 [&_h1]:mt-0 [&_h2]:mt-0 [&_h3]:mt-0 max-[540px]:gap-[17px]"
          data-seller="page-stack"
        >
          <Panel
            title="Hiệu suất vận chuyển"
            action={<TruckOutlined className="text-[20px]" aria-hidden="true" />}
          >
            <div
              className="flex gap-[13px] items-center [margin:8px_0_20px] [&_strong]:text-[11px] [&_strong]:font-[550] [&_p]:text-[9px] [&_p]:text-[#96a5bd] [&_p]:my-1 [&_p]:mx-0"
              data-seller="shipping-score"
            >
              <div
                className="w-15.5 h-15.5 [border:6px_solid_#e5ecfb] [border-top-color:#315eea] [border-right-color:#315eea] rounded-full grid [place-items:center] text-[12px] font-[650] shrink-0"
                data-seller="score-ring"
              >
                {preview ? '99,4%' : '—'}
              </div>
              <div>
                <strong>Tỷ lệ giao đúng hạn</strong>
                <p>
                  {preview ? 'Số liệu minh họa trong kỳ báo cáo.' : 'Chưa có dữ liệu vận chuyển.'}
                </p>
              </div>
            </div>
            <div
              className="grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] gap-2.5 [&>div]:p-[11px] [&>div]:bg-[#f7f9fd] [&>div]:[border:1px_solid_#eef2f8] [&>div]:rounded-[8px] [&_small]:text-[9px] [&_small]:text-[#94a3bb] [&_small]:block [&_small]:mb-1.5 [&_b]:text-[12px]"
              data-seller="mini-stats"
            >
              <div>
                <small>Chuẩn bị hàng TB</small>
                <b>{preview ? '1,8 giờ' : '—'}</b>
              </div>
              <div>
                <small>Khiếu nại vận chuyển</small>
                <b>{preview ? '0' : '—'}</b>
              </div>
            </div>
          </Panel>
          <Panel title="Lịch lấy hàng GHN" subtitle="Theo dõi kế hoạch bàn giao">
            <div
              className="flex flex-col items-center text-center gap-2.5 py-2.5 px-0 text-[#8da6ce] [&_strong]:text-[11px] [&_strong]:text-[#7186aa] [&_strong]:font-[550] [&_p]:text-[10px] [&_p]:text-[#9cabc0] [&_p]:leading-[1.8] [&_p]:m-0"
              data-seller="pickup"
            >
              <TruckOutlined className="text-[25px]" aria-hidden="true" />
              <strong>Chưa có lịch lấy hàng</strong>
              <p>Lịch và thông tin tài xế sẽ hiển thị sau khi tạo yêu cầu vận chuyển.</p>
            </div>
          </Panel>
          <ShippingGuide />
        </aside>
      </div>
      <Popup isOpen={!!detail} onClose={() => setDetail(null)} title="Chi tiết đơn hàng" size="lg">
        {detail && <OrderDetail order={detail} />}
      </Popup>
      <Popup isOpen={warehouse} onClose={() => setWarehouse(false)} title="Kho giao hàng GHN">
        <div
          className="flex flex-col gap-5 text-[#566b8c] text-[13px] [&_h3]:font-[650] [&_h3]:text-[17px] [&_h3]:text-[#1e355b] [&_h3]:m-0 [&_p]:leading-[1.9] [&_p]:m-0 [&_p]:text-[#8192ac]"
          data-seller="detail-content"
        >
          <TruckOutlined className="text-[32px]" aria-hidden="true" />
          <h3>Liên kết kho giao hàng</h3>
          <p>
            Chưa có dịch vụ cấu hình GHN cho gian hàng. Bạn có thể chuẩn bị địa chỉ lấy hàng, người
            liên hệ và số điện thoại tại Cài đặt Shop.
          </p>
          <SellerLink to="/seller/settings">
            Đến cài đặt Shop <ArrowRightOutlined className="text-[15px]" aria-hidden="true" />
          </SellerLink>
        </div>
      </Popup>
    </div>
  );
}
