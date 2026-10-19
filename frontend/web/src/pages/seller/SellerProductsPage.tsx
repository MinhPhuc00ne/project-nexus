import { cn } from '../../lib/utils';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightOutlined,
  CodeSandboxOutlined,
  ProfileOutlined,
  FileTextOutlined,
  PictureOutlined,
  BuildOutlined,
  InboxOutlined,
  PlusOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useSellerWorkspace } from '../../components/seller/SellerWorkspace';
import {
  Badge,
  EmptyState,
  ModuleNotice,
  PageHeading,
  Panel,
  SellerLink,
  StatCard,
} from '../../components/seller/SellerUI';
import { money, previewAuctions } from '../../components/seller/sellerData';

export default function SellerProductsPage({ inventory = false }: { inventory?: boolean }) {
  const { preview, search, setSearch, drafts, deleteDraft } = useSellerWorkspace();
  const [tab, setTab] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState('');
  const products = preview
    ? previewAuctions.filter((item) =>
        item.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
      )
    : [];
  const productDrafts = drafts.filter(
    (item) =>
      item.kind === 'product' &&
      item.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  return (
    <div
      className="flex flex-col gap-5.5 min-w-0 [&>[data-seller~=page-stack]]:gap-4 [&_h1]:mt-0 [&_h2]:mt-0 [&_h3]:mt-0 max-[540px]:gap-[17px]"
      data-seller="page-stack"
    >
      <PageHeading
        title={inventory ? 'Kho hàng & tồn kho' : 'Kho & sản phẩm'}
        description="Sắp xếp danh mục, chuẩn bị sản phẩm và theo dõi hàng hóa của gian hàng."
        actions={
          <SellerLink to="/seller/products/new">
            <PlusOutlined className="text-[16px]" aria-hidden="true" />
            Thêm sản phẩm
          </SellerLink>
        }
      />
      <div
        className="grid [grid-template-columns:repeat(4,_minmax(0,_1fr))] gap-4 min-[1600px]:gap-5 max-[1250px]:gap-3 max-[1050px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[540px]:gap-2.5"
        data-seller="stats-grid"
      >
        <StatCard
          label="Sản phẩm của gian hàng"
          value={preview ? '05' : '—'}
          detail="Danh mục sản phẩm"
          icon={<InboxOutlined className="text-[20px]" aria-hidden="true" />}
        />
        <StatCard
          label="Bản nháp sản phẩm"
          value={String(drafts.filter((item) => item.kind === 'product').length).padStart(2, '0')}
          detail="Lưu trên thiết bị này"
          icon={<FileTextOutlined className="text-[20px]" aria-hidden="true" />}
        />
        <StatCard
          label="Tồn kho khả dụng"
          value="—"
          detail="Chưa có dữ liệu kho hàng"
          icon={<BuildOutlined className="text-[20px]" aria-hidden="true" />}
        />
        <StatCard
          label="Đang giữ cho đấu giá"
          value="—"
          detail="Theo dõi hàng ký quỹ"
          icon={<CodeSandboxOutlined className="text-[20px]" aria-hidden="true" />}
        />
      </div>
      <ModuleNotice label="Sản phẩm và kho hàng" />
      <div
        className="flex items-center flex-wrap gap-2.5 bg-white [border:1px_solid_#e5ebf4] rounded-[10px] p-[13px] [&_select]:[border:1px_solid_#e5ebf4] [&_select]:rounded-[7px] [&_select]:bg-[#f9fbff] [&_select]:py-2 [&_select]:px-2.5 [&_select]:text-[#7384a1] [&_select]:text-[10px] [&_select]:min-h-8.5 [&_select]:max-w-full max-[540px]:p-[11px] max-[540px]:gap-2 max-[540px]:[&>[data-seller~=search-field]]:max-w-[none] max-[540px]:[&>[data-seller~=search-field]]:min-w-full max-[540px]:[&>[data-seller~=button]]:flex-1 max-[540px]:[&>[data-seller~=button]]:py-2 max-[540px]:[&>[data-seller~=button]]:px-2.5 max-[540px]:[&_select]:flex-1"
        data-seller="toolbar"
      >
        <div
          className="flex gap-1 items-center flex-wrap [&_button]:[border:0] [&_button]:bg-transparent [&_button]:text-[#7a89a1] [&_button]:py-2 [&_button]:px-3 [&_button]:rounded-[6px] [&_button]:text-[10px] [&_button]:flex [&_button]:items-center [&_button]:gap-[7px] [&_button]:whitespace-nowrap [&_button.is-active]:text-[#315eea] [&_button.is-active]:bg-[#edf3ff] [&_button.is-active]:font-[650] [&_button>span:not(.anticon)]:text-[9px] [&_button>span:not(.anticon)]:bg-[#edf1f8] [&_button>span:not(.anticon)]:py-0 [&_button>span:not(.anticon)]:px-[5px] [&_button>span:not(.anticon)]:rounded-[4px] [&_button.is-active>span:not(.anticon)]:bg-[#315eea] [&_button.is-active>span:not(.anticon)]:text-[#fff] max-[540px]:[&_button]:py-[7px] max-[540px]:[&_button]:px-2.5 max-[540px]:[&_button]:text-[9px]"
          data-seller="tabs"
        >
          <Link
            className={cn(
              `inline-flex items-center justify-center gap-[7px] bg-[#315eea] [border:1px_solid_#315eea] rounded-[7px] text-[#fff] py-[9px] px-3.5 text-[11px]! font-[550] whitespace-nowrap min-h-9 [&:hover]:bg-[#244ed1] [&:hover]:[box-shadow:0_3px_9px_#315eea20] ${!inventory ? '' : 'bg-white [border-color:#dfe6f1] text-[#4d5f7e] [&:hover]:bg-[#f3f7ff] [&:hover]:text-[#315eea] [&:hover]:[box-shadow:none]'}`,
            )}
            data-seller="button button-secondary"
            to="/seller/products"
          >
            Sản phẩm
          </Link>
          <Link
            className={cn(
              `inline-flex items-center justify-center gap-[7px] bg-[#315eea] [border:1px_solid_#315eea] rounded-[7px] text-[#fff] py-[9px] px-3.5 text-[11px]! font-[550] whitespace-nowrap min-h-9 [&:hover]:bg-[#244ed1] [&:hover]:[box-shadow:0_3px_9px_#315eea20] ${inventory ? '' : 'bg-white [border-color:#dfe6f1] text-[#4d5f7e] [&:hover]:bg-[#f3f7ff] [&:hover]:text-[#315eea] [&:hover]:[box-shadow:none]'}`,
            )}
            data-seller="button button-secondary"
            to="/seller/inventory"
          >
            Kho hàng & SKU
          </Link>
        </div>
        <div className="flex-1 max-[540px]:hidden" data-seller="toolbar-spacer" />
        <label
          className="flex items-center gap-2 [border:1px_solid_#e5ebf4] rounded-[7px] py-2 px-2.5 min-w-[160px] flex-1 max-w-[330px] text-[#8da0bf] bg-[#f9fbff] [&_input]:[border:0] [&_input]:bg-transparent [&_input]:[outline:none] [&_input]:w-full [&_input]:min-w-0 [&_input]:text-[10px] [&_input::placeholder]:text-[#a0aec3]"
          data-seller="search-field"
        >
          <SearchOutlined className="text-[16px]" aria-hidden="true" />
          <input
            aria-label="Tìm sản phẩm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên sản phẩm..."
          />
        </label>
      </div>
      {inventory ? (
        <Panel
          title="Tồn kho theo SKU"
          subtitle="Theo dõi số lượng khả dụng, đang giữ và nhật ký nhập xuất"
        >
          <EmptyState
            title="Chưa có dữ liệu tồn kho"
            description="Tồn kho thực tế sẽ được hiển thị khi hệ thống kho hàng được kết nối."
            action={
              <SellerLink to="/seller/products" secondary>
                Danh sách sản phẩm <ArrowRightOutlined className="text-[15px]" aria-hidden="true" />
              </SellerLink>
            }
          />
        </Panel>
      ) : (
        <>
          <div
            className="flex gap-1 items-center flex-wrap [&_button]:[border:0] [&_button]:bg-transparent [&_button]:text-[#7a89a1] [&_button]:py-2 [&_button]:px-3 [&_button]:rounded-[6px] [&_button]:text-[10px] [&_button]:flex [&_button]:items-center [&_button]:gap-[7px] [&_button]:whitespace-nowrap [&_button.is-active]:text-[#315eea] [&_button.is-active]:bg-[#edf3ff] [&_button.is-active]:font-[650] [&_button>span:not(.anticon)]:text-[9px] [&_button>span:not(.anticon)]:bg-[#edf1f8] [&_button>span:not(.anticon)]:py-0 [&_button>span:not(.anticon)]:px-[5px] [&_button>span:not(.anticon)]:rounded-[4px] [&_button.is-active>span:not(.anticon)]:bg-[#315eea] [&_button.is-active>span:not(.anticon)]:text-[#fff] max-[540px]:[&_button]:py-[7px] max-[540px]:[&_button]:px-2.5 max-[540px]:[&_button]:text-[9px]"
            data-seller="tabs"
          >
            {[
              ['all', 'Tất cả'],
              ['products', 'Sản phẩm'],
              ['drafts', 'Bản nháp trên thiết bị'],
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
          {tab !== 'drafts' && (
            <Panel title="Danh sách sản phẩm" subtitle="Quản lý thông tin và trạng thái hiển thị">
              {products.length ? (
                <div
                  className="grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-4.5 max-[1050px]:gap-3 max-[540px]:[grid-template-columns:1fr]"
                  data-seller="auction-preview-grid"
                >
                  {products.map((product) => (
                    <article
                      className="[border:1px_solid_#e5ebf4] rounded-[10px] overflow-hidden text-inherit [&:hover_[data-seller~=preview-image]>img]:[transform:scale(1.05)] [&>div:not(:first-child)]:p-[13px] [&_strong]:block [&_strong]:text-[11px] [&_strong]:font-semibold [&_small]:text-[9px] [&_small]:text-[#92a2bc] [&_small]:block [&_small]:my-1 [&_small]:mx-0 [&_[data-seller~=preview-price]]:[margin:0_12px_12px] [&_[data-seller~=preview-price]]:rounded-[8px] [&_[data-seller~=preview-price]]:bg-[#f5f8fe] [&_[data-seller~=preview-price]]:p-[11px]! [&_[data-seller~=preview-price]_b]:text-[15px] max-[760px]:[&_strong]:text-[10px] max-[540px]:[&_strong]:text-[13px] max-[540px]:[&_[data-seller~=preview-price]_b]:text-[17px]"
                      data-seller="auction-preview"
                      key={product.id}
                    >
                      <div
                        className="h-[165px] relative [background:linear-gradient(130deg,_#f2f5fb,_#e7edf8)] grid [place-items:center] overflow-hidden [&>img]:w-[80%] [&>img]:h-[90%] [&>img]:object-contain [&>img]:mix-blend-multiply [&>img]:[transition:transform_0.3s] [&>[data-seller~=badge]]:absolute [&>[data-seller~=badge]]:left-2.5 [&>[data-seller~=badge]]:top-2.5 [&>[data-seller~=badge]]:bg-[#f1fbf8] max-[1050px]:h-[135px] max-[540px]:h-[195px]"
                        data-seller="preview-image"
                      >
                        <img src={product.image} alt={product.title} />
                        <Badge tone="gray">Minh họa</Badge>
                      </div>
                      <div>
                        <strong>{product.title}</strong>
                        <small>SKU: {product.id} · Đồng hồ & Trang sức</small>
                      </div>
                      <div
                        className="ml-auto [&_small]:text-[9px] [&_small]:text-[#96a4bb] [&_small]:block [&_b]:text-[11px] [&_b]:block [&>span:not(.anticon)]:flex [&>span:not(.anticon)]:items-center [&>span:not(.anticon)]:justify-between [&>span:not(.anticon)]:text-[9px] [&>span:not(.anticon)]:text-[#315eea] [&>span:not(.anticon)]:mt-[9px]"
                        data-seller="preview-price"
                      >
                        <small>Giá tham khảo</small>
                        <b>{money(product.price)}</b>
                        <span>
                          Vật phẩm sưu tầm{' '}
                          <CodeSandboxOutlined className="text-[14px]" aria-hidden="true" />
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={
                    search
                      ? 'Không có sản phẩm phù hợp'
                      : 'Danh mục của bạn đang chờ sản phẩm đầu tiên'
                  }
                  description="Chuẩn bị thông tin, mô tả và giá bán trước khi phát hành sản phẩm."
                  action={
                    <SellerLink to="/seller/products/new">
                      <PlusOutlined className="text-[15px]" aria-hidden="true" />
                      Tạo bản nháp sản phẩm
                    </SellerLink>
                  }
                />
              )}
            </Panel>
          )}
          {tab !== 'products' && (
            <Panel title="Bản nháp trên thiết bị" subtitle="Chưa đăng bán và chưa gửi lên hệ thống">
              {productDrafts.length ? (
                <div className="flex flex-col gap-2.5" data-seller="mini-list">
                  {productDrafts.map((draft) => (
                    <div
                      className="flex items-center gap-[13px] p-[13px] [border:1px_solid_#e9eef7] rounded-[9px] [&>.anticon]:text-[#7c9bd8]! [&>.anticon]:shrink-0 [&_strong]:text-[12px] [&_strong]:font-[550] [&_strong]:block [&_small]:text-[10px] [&_small]:text-[#91a2bc] [&_small]:block [&_small]:mt-1 [&_[data-seller~=badge]]:ml-auto [&_button]:ml-2 max-[540px]:flex-wrap max-[540px]:[&>div]:min-w-[170px] max-[540px]:[&>div]:flex-1 max-[540px]:[&_small]:text-[9px] max-[540px]:[&_[data-seller~=text-button]]:ml-auto"
                      data-seller="draft-row"
                      key={draft.id}
                    >
                      <InboxOutlined className="text-[22px]" aria-hidden="true" />
                      <div>
                        <strong>{draft.title}</strong>
                        <small>
                          {money(draft.price)} · Số lượng dự kiến: {draft.quantity}
                        </small>
                      </div>
                      <Badge tone="gray">Bản nháp</Badge>
                      {confirmDelete === draft.id ? (
                        <>
                          <button
                            className="inline-flex items-center gap-1.5 p-0 [border:0] bg-transparent text-[#315eea] text-[10px] font-[550]"
                            data-seller="text-button"
                            onClick={() => {
                              deleteDraft(draft.id);
                              setConfirmDelete('');
                            }}
                          >
                            Xác nhận xóa
                          </button>
                          <button
                            className="inline-flex items-center gap-1.5 p-0 [border:0] bg-transparent text-[#315eea] text-[10px] font-[550]"
                            data-seller="text-button"
                            onClick={() => setConfirmDelete('')}
                          >
                            Hủy
                          </button>
                        </>
                      ) : (
                        <button
                          className="inline-flex items-center gap-1.5 p-0 [border:0] bg-transparent text-[#315eea] text-[10px] font-[550]"
                          data-seller="text-button"
                          aria-label={`Xóa bản nháp ${draft.title}`}
                          onClick={() => setConfirmDelete(draft.id)}
                        >
                          <DeleteOutlined className="text-[15px]" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Chưa có bản nháp phù hợp"
                  description="Các sản phẩm được lưu nháp trên trình duyệt này sẽ nằm ở đây."
                />
              )}
            </Panel>
          )}
        </>
      )}
      <div
        className="grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-4.5 max-[1050px]:gap-3 max-[540px]:[grid-template-columns:1fr]"
        data-seller="policy-grid"
      >
        <div
          className="bg-white [border:1px_solid_#e5ebf4] rounded-[11px] p-[21px] [&>.anticon]:text-[#7291d7]! [&>.anticon]:mb-3 [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:mb-[9px] [&_p]:text-[11px] [&_p]:text-[#8c9bb1] [&_p]:m-0 [&_p]:leading-[1.9] max-[1050px]:p-[17px] max-[760px]:[&_h3]:text-[11px] max-[760px]:[&_p]:text-[10px] max-[540px]:p-4.5 max-[540px]:grid max-[540px]:[grid-template-columns:24px_1fr] max-[540px]:gap-x-3 max-[540px]:[&>.anticon]:[grid-row:1/3] max-[540px]:[&>.anticon]:m-0 max-[540px]:[&_h3]:[margin:0_0_7px] max-[540px]:[&_h3]:text-[12px] max-[540px]:[&_p]:text-[10px]"
          data-seller="policy"
        >
          <PictureOutlined className="text-[22px]" aria-hidden="true" />
          <h3>Hình ảnh rõ nét</h3>
          <p>Chuẩn bị tối đa 5 ảnh sản phẩm, thể hiện chi tiết và tình trạng thực tế.</p>
        </div>
        <div
          className="bg-white [border:1px_solid_#e5ebf4] rounded-[11px] p-[21px] [&>.anticon]:text-[#7291d7]! [&>.anticon]:mb-3 [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:mb-[9px] [&_p]:text-[11px] [&_p]:text-[#8c9bb1] [&_p]:m-0 [&_p]:leading-[1.9] max-[1050px]:p-[17px] max-[760px]:[&_h3]:text-[11px] max-[760px]:[&_p]:text-[10px] max-[540px]:p-4.5 max-[540px]:grid max-[540px]:[grid-template-columns:24px_1fr] max-[540px]:gap-x-3 max-[540px]:[&>.anticon]:[grid-row:1/3] max-[540px]:[&>.anticon]:m-0 max-[540px]:[&_h3]:[margin:0_0_7px] max-[540px]:[&_h3]:text-[12px] max-[540px]:[&_p]:text-[10px]"
          data-seller="policy"
        >
          <ProfileOutlined className="text-[22px]" aria-hidden="true" />
          <h3>Thông tin đầy đủ</h3>
          <p>Ghi rõ mô tả, giá, khối lượng và kích thước để chuẩn bị đăng bán.</p>
        </div>
        <div
          className="bg-white [border:1px_solid_#e5ebf4] rounded-[11px] p-[21px] [&>.anticon]:text-[#7291d7]! [&>.anticon]:mb-3 [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:mb-[9px] [&_p]:text-[11px] [&_p]:text-[#8c9bb1] [&_p]:m-0 [&_p]:leading-[1.9] max-[1050px]:p-[17px] max-[760px]:[&_h3]:text-[11px] max-[760px]:[&_p]:text-[10px] max-[540px]:p-4.5 max-[540px]:grid max-[540px]:[grid-template-columns:24px_1fr] max-[540px]:gap-x-3 max-[540px]:[&>.anticon]:[grid-row:1/3] max-[540px]:[&>.anticon]:m-0 max-[540px]:[&_h3]:[margin:0_0_7px] max-[540px]:[&_h3]:text-[12px] max-[540px]:[&_p]:text-[10px]"
          data-seller="policy"
        >
          <SafetyCertificateOutlined className="text-[22px]" aria-hidden="true" />
          <h3>Quản lý chính xác</h3>
          <p>Đối chiếu tồn kho trước khi mở bán và đưa sản phẩm vào phiên đấu giá.</p>
        </div>
      </div>
    </div>
  );
}
