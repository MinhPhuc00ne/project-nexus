import { BadgeCheck, LockKeyhole, Scan, ShieldCheck, Truck } from 'lucide-react';
import RegisterForm from '../../components/register/registerForm';

const benefits = [
  {
    icon: Scan,
    title: 'Đấu Giá Trực Tuyến 4K',
    description: 'Thước phim thẩm định thực tế chuẩn 4K trước khi gõ búa.',
  },
  {
    icon: ShieldCheck,
    title: 'Bảo Chứng Escrow An Toàn',
    description: 'Ký quỹ minh bạch, hoàn cọc tự động qua cổng thanh toán liên ngân hàng.',
  },
  {
    icon: Truck,
    title: 'Đồng Kiểm & Niêm Phong',
    description: 'Vận chuyển hỏa tốc, bảo hiểm 100% giá trị vật phẩm khi giao nhận.',
  },
];

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* <Header /> */}

      <main className="flex flex-1 items-center justify-center bg-[linear-gradient(135deg,#eaf0fb_0%,#f3f7fb_60%,#f0f2fc_100%)] px-5 py-8 text-slate-900 sm:px-9">
        <div className="grid w-full max-w-[1100px] items-center gap-8 min-[900px]:grid-cols-[0.82fr_1.18fr] min-[900px]:gap-12">
          <section
            className="mx-auto w-full max-w-[440px] min-[900px]:mx-0"
            aria-labelledby="register-intro-title"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-blue-600">
              <span className="size-1.5 rounded-full bg-blue-600" aria-hidden="true" />
              NEXUS ONBOARDING
            </span>
            <h1
              id="register-intro-title"
              className="mt-3 mb-2 text-[30px] leading-tight font-bold sm:text-4xl"
            >
              Khởi Đầu Cùng <span className="text-blue-600">NEXUS</span>
            </h1>
            <p className="max-w-[380px] text-sm leading-[1.65] text-slate-600">
              Gia nhập nền tảng đấu giá trực tuyến và mua sắm tài sản số 3D thế hệ mới chỉ trong vài
              bước đơn giản.
            </p>

            <div className="mt-8 flex flex-col gap-4">
              {benefits.map(({ icon: Icon, title, description }) => (
                <div className="flex items-start gap-4" key={title}>
                  <span className="flex h-8 w-7 shrink-0 items-center justify-center text-blue-600">
                    <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="mb-0.5 text-sm leading-5 font-semibold">{title}</h2>
                    <p className="max-w-[325px] text-xs leading-[1.65] text-slate-500">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-200 pt-4 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <LockKeyhole size={12} className="text-emerald-600" aria-hidden="true" />
                Mã hóa SSL 256-Bit
              </span>
              <span className="text-slate-300" aria-hidden="true">
                •
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck size={13} className="text-blue-600" aria-hidden="true" />
                Bảo mật dữ liệu tuyệt đối
              </span>
            </div>
          </section>

          <RegisterForm />
        </div>
      </main>
      {/* <Footer /> */}
    </div>
  );
}
