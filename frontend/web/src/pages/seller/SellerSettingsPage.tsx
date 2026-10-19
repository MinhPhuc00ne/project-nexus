import { cn } from '../../lib/utils';
import { useState, type FormEvent } from 'react';
import {
  BellOutlined,
  CheckOutlined,
  FileTextOutlined,
  LockOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useSellerSession } from '../../components/seller/SellerSession';
import { useSellerWorkspace } from '../../components/seller/SellerWorkspace';
import { PageHeading, Panel, SellerButton } from '../../components/seller/SellerUI';
import { trustLabels } from '../../components/seller/sellerData';

export default function SellerSettingsPage() {
  const user = useSellerSession();
  const { storeName, notify } = useSellerWorkspace();
  const [tab, setTab] = useState('store');
  const key = `nexus:seller-settings:${user.id}`;
  const [form, setForm] = useState(() => {
    const defaults = {
      displayName: storeName,
      description: '',
      contact: user.phoneNumber || '',
      address: '',
      recipient: user.fullName,
      notifications: true,
    };
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      return saved && typeof saved.displayName === 'string' && typeof saved.address === 'string'
        ? ({ ...defaults, ...saved } as typeof defaults)
        : defaults;
    } catch {
      return defaults;
    }
  });
  const save = (event: FormEvent) => {
    event.preventDefault();
    try {
      localStorage.setItem(key, JSON.stringify(form));
      notify('Đã lưu bản nháp cài đặt trên thiết bị. Chưa cập nhật lên hệ thống.');
    } catch {
      notify('Không thể lưu bản nháp cài đặt. Vui lòng kiểm tra bộ nhớ trình duyệt.');
    }
  };
  return (
    <div
      className="flex flex-col gap-5.5 min-w-0 [&>[data-seller~=page-stack]]:gap-4 [&_h1]:mt-0 [&_h2]:mt-0 [&_h3]:mt-0 max-[540px]:gap-[17px]"
      data-seller="page-stack"
    >
      <PageHeading
        title="Cài đặt Shop"
        description="Thông tin rõ ràng, gian hàng chuyên nghiệp, vận hành hiệu quả."
      />
      <div
        className="grid [grid-template-columns:205px_minmax(0,_1fr)] gap-5 [align-items:start] max-[1050px]:[grid-template-columns:170px_minmax(0,_1fr)] max-[760px]:[grid-template-columns:1fr] max-[760px]:[&>[data-seller~=panel]]:p-2"
        data-seller="settings-grid"
      >
        <section
          className="[border:1px_solid_#e5ebf4] rounded-[12px] p-5.5 bg-white min-w-0 [&>[data-seller~=text-button]]:mt-4.5 [&>[data-seller~=button]]:mt-4.5 min-[1600px]:p-[25px] max-[1050px]:p-4.5 max-[540px]:p-[17px]"
          data-seller="panel"
        >
          <nav
            className="flex flex-col gap-[5px] [&_button]:bg-transparent [&_button]:[border:0] [&_button]:py-[11px] [&_button]:px-[13px] [&_button]:text-left [&_button]:text-[11px] [&_button]:text-[#8c9db6] [&_button]:rounded-[7px] [&_button]:flex [&_button]:items-center [&_button]:gap-[9px] [&_button.is-active]:bg-[#edf3ff] [&_button.is-active]:text-[#315eea] max-[760px]:flex-row max-[760px]:flex-wrap max-[760px]:[&_button]:py-[9px] max-[760px]:[&_button]:px-[11px]"
            data-seller="setting-tabs"
            aria-label="Cài đặt gian hàng"
          >
            {[
              { key: 'store', label: 'Hồ sơ gian hàng', icon: ShopOutlined },
              { key: 'account', label: 'Tài khoản & bảo mật', icon: SafetyCertificateOutlined },
              { key: 'shipping', label: 'Địa chỉ lấy hàng', icon: EnvironmentOutlined },
              { key: 'notifications', label: 'Thông báo', icon: BellOutlined },
            ].map(({ key: item, label, icon: Icon }) => (
              <button
                key={item}
                className={cn(tab === item ? 'is-active' : '')}
                onClick={() => setTab(item)}
              >
                <Icon className="text-[16px]" aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>
        </section>
        <Panel
          title={
            tab === 'account'
              ? 'Tài khoản & bảo mật'
              : tab === 'shipping'
                ? 'Địa chỉ lấy hàng'
                : tab === 'notifications'
                  ? 'Tùy chọn thông báo'
                  : 'Hồ sơ gian hàng'
          }
          subtitle={
            tab === 'account'
              ? 'Thông tin tài khoản từ hệ thống'
              : 'Chuẩn bị thông tin cài đặt cho gian hàng'
          }
        >
          <div
            className="flex items-center gap-[15px] mb-6 pb-5.5 [border-bottom:1px_solid_#edf1f7] [&_[data-seller~=avatar]]:w-[55px] [&_[data-seller~=avatar]]:h-[55px] [&_[data-seller~=avatar]]:text-[19px] [&_strong]:block [&_strong]:text-[15px] [&_strong]:font-semibold [&_small]:text-[10px] [&_small]:text-[#8e9fba]"
            data-seller="account-profile"
          >
            <span
              className="grid [place-items:center] w-8.5 h-8.5 shrink-0 rounded-full [border:1px_solid_#dce6fd] bg-[#eef3ff] text-[#315eea] text-[11px] font-[650] overflow-hidden [&_img]:w-full [&_img]:h-full [&_img]:object-cover max-[540px]:w-[31px] max-[540px]:h-[31px]"
              data-seller="avatar"
            >
              {user.fullName.charAt(0)}
            </span>
            <div>
              <strong>{storeName || user.fullName}</strong>
              <small>{user.email}</small>
            </div>
          </div>
          {tab === 'account' ? (
            <>
              <dl
                className="grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] gap-4 [border:1px_solid_#e6edf8] rounded-[10px] p-5 [&_small]:block [&_small]:text-[9px] [&_small]:text-[#98a9c2] [&_small]:mb-[5px] [&_small]:tracking-[0.5px] [&_strong]:font-[550] [&_strong]:text-[12px] [&_strong]:text-[#4f6484] [&_p]:text-[11px] max-[540px]:p-[15px] max-[540px]:gap-[15px]"
                data-seller="detail-grid"
              >
                {[
                  ['HỌ VÀ TÊN', user.fullName],
                  ['EMAIL', user.email],
                  ['SỐ ĐIỆN THOẠI', user.phoneNumber || 'Chưa cập nhật'],
                  ['VAI TRÒ', 'Người bán'],
                  ['XÁC THỰC', user.isVerified ? 'Đã xác thực' : 'Chưa xác thực'],
                  ['MỨC TÍN NHIỆM', trustLabels[user.trustLevel] || user.trustLevel],
                ].map(([label, value]) => (
                  <div key={label}>
                    <small>{label}</small>
                    <strong className="[overflow-wrap:anywhere]">{value}</strong>
                  </div>
                ))}
              </dl>
              <div
                className="flex gap-2.5 items-center p-[15px] [border:1px_solid_#e3ebfa] bg-[#f4f8ff] rounded-[9px] text-[#8194b1] text-[11px] leading-[1.8] [&>.anticon]:shrink-0 [&>.anticon]:text-[#7194db]! [&>[data-seller~=text-button]]:ml-auto [&>[data-seller~=text-button]]:whitespace-nowrap max-[540px]:text-[10px] max-[540px]:flex-wrap max-[540px]:[&>span:not(.anticon)]:flex-1 max-[540px]:[&_[data-seller~=text-button]]:ml-[27px] mt-5"
                data-seller="info-note"
              >
                <LockOutlined className="text-[18px]" aria-hidden="true" />
                Bạn có thể sử dụng chức năng Quên mật khẩu tại trang đăng nhập để đặt lại mật khẩu.
              </div>
            </>
          ) : (
            <form
              className="flex flex-col gap-4.5 [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#667d9e] [&_label]:font-medium [&_input]:w-full [&_input]:[border:1px_solid_#e1e8f4] [&_input]:rounded-[7px] [&_input]:py-2.5 [&_input]:px-3 [&_input]:bg-[#fbfcff] [&_input]:text-[#3c5274] [&_input]:text-[12px] [&_input]:min-w-0 [&_textarea]:w-full [&_textarea]:[border:1px_solid_#e1e8f4] [&_textarea]:rounded-[7px] [&_textarea]:py-2.5 [&_textarea]:px-3 [&_textarea]:bg-[#fbfcff] [&_textarea]:text-[#3c5274] [&_textarea]:text-[12px] [&_textarea]:min-w-0 [&_textarea]:resize-y [&_textarea]:min-h-[110px] [&_select]:w-full [&_select]:[border:1px_solid_#e1e8f4] [&_select]:rounded-[7px] [&_select]:py-2.5 [&_select]:px-3 [&_select]:bg-[#fbfcff] [&_select]:text-[#3c5274] [&_select]:text-[12px] [&_select]:min-w-0 [&_input[readonly]]:bg-[#f5f7fb] [&_input[readonly]]:text-[#8b9cb6] [&_input::placeholder]:text-[#a8b5c9] [&_textarea::placeholder]:text-[#a8b5c9] [&_small]:text-[#9aa9be] [&_small]:text-[9px] [&_small]:font-normal [&_[data-seller~=form-row]]:grid [&_[data-seller~=form-row]]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [&_[data-seller~=form-row]]:gap-4 max-[540px]:[&_[data-seller~=form-row]]:[grid-template-columns:1fr]"
              data-seller="form"
              onSubmit={save}
            >
              <div
                className="flex gap-2.5 items-center p-[15px] [border:1px_solid_#e3ebfa] bg-[#f4f8ff] rounded-[9px] text-[#8194b1] text-[11px] leading-[1.8] [&>.anticon]:shrink-0 [&>.anticon]:text-[#7194db]! [&>[data-seller~=text-button]]:ml-auto [&>[data-seller~=text-button]]:whitespace-nowrap max-[540px]:text-[10px] max-[540px]:flex-wrap max-[540px]:[&>span:not(.anticon)]:flex-1 max-[540px]:[&_[data-seller~=text-button]]:ml-[27px]"
                data-seller="info-note"
              >
                <FileTextOutlined className="text-[17px]" aria-hidden="true" />
                Cài đặt ở đây chỉ lưu nháp trên thiết bị, chưa thay đổi hồ sơ hoặc cấu hình GHN trên
                hệ thống.
              </div>
              {tab === 'store' && (
                <>
                  <label>
                    Tên gian hàng dự kiến
                    <input
                      maxLength={160}
                      value={form.displayName}
                      placeholder={storeName || 'Nhập tên gian hàng'}
                      onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                    />
                  </label>
                  <label>
                    Giới thiệu gian hàng
                    <textarea
                      maxLength={3000}
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                      placeholder="Câu chuyện thương hiệu và sản phẩm của bạn..."
                    />
                  </label>
                  <label>
                    Số điện thoại liên hệ
                    <input
                      maxLength={20}
                      value={form.contact}
                      onChange={(event) => setForm({ ...form, contact: event.target.value })}
                    />
                  </label>
                </>
              )}
              {tab === 'shipping' && (
                <>
                  <label>
                    Người liên hệ
                    <input
                      required
                      maxLength={100}
                      value={form.recipient}
                      onChange={(event) => setForm({ ...form, recipient: event.target.value })}
                    />
                  </label>
                  <label>
                    Số điện thoại
                    <input
                      required
                      type="tel"
                      maxLength={20}
                      value={form.contact}
                      onChange={(event) => setForm({ ...form, contact: event.target.value })}
                    />
                  </label>
                  <label>
                    Địa chỉ lấy hàng dự kiến
                    <textarea
                      required
                      maxLength={500}
                      value={form.address}
                      onChange={(event) => setForm({ ...form, address: event.target.value })}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                    />
                  </label>
                </>
              )}
              {tab === 'notifications' && (
                <div
                  className="flex items-center gap-3 py-[17px] px-0 [border-bottom:1px_solid_#edf2f8] [&>.anticon]:text-[#7698d7]! [&>.anticon]:shrink-0 [&>div]:flex-1 [&_strong]:block [&_strong]:text-[11px] [&_strong]:font-[550] [&_p]:text-[10px] [&_p]:text-[#8e9fba] [&_p]:[margin:4px_0_0]"
                  data-seller="security-item"
                >
                  <BellOutlined className="text-[22px]" aria-hidden="true" />
                  <div>
                    <strong>Nhận thông báo hoạt động</strong>
                    <p>Lưu tùy chọn cho đơn hàng và phiên đấu giá.</p>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Nhận thông báo hoạt động"
                    checked={form.notifications}
                    onChange={(event) => setForm({ ...form, notifications: event.target.checked })}
                    className="w-[17px]!"
                  />
                </div>
              )}
              <div
                className="flex items-center justify-end gap-2.5 pt-4.5 [border-top:1px_solid_#eef2f8] max-[540px]:flex-wrap max-[540px]:[&_[data-seller~=button]]:flex-1"
                data-seller="form-actions"
              >
                <SellerButton type="submit">
                  <CheckOutlined className="text-[15px]" aria-hidden="true" />
                  Lưu bản nháp cài đặt
                </SellerButton>
              </div>
            </form>
          )}
        </Panel>
      </div>
    </div>
  );
}
