import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { ApiRequestError } from '../services/api';
import { getStoredToken } from '../services/auth';
import { getMe } from '../services/users';

type Access = {
  // Gắn kết quả với token đã kiểm tra để không dùng nhầm quyền của phiên cũ.
  token: string | null;
  // loading: đang kiểm tra; allowed: được xem trang; admin: cần chuyển hướng;
  // error: chưa xác minh được do lỗi mạng, máy chủ hoặc dữ liệu không hợp lệ.
  status: 'loading' | 'allowed' | 'admin' | 'error';
};

// Đây là guard dùng chung cho các route ngoài /admin, không phải layout giao diện.
// AppRouter bọc các route đó bằng component này; route /admin dùng AdminLayout riêng.
// Guard chỉ giới hạn điều hướng FE; quyền gọi API vẫn phải được kiểm tra ở BE.
export default function NonAdminLayout() {
  const token = getStoredToken();
  const [access, setAccess] = useState<Access>({ token: null, status: 'loading' });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    // active ngăn cập nhật state sau khi component bị gỡ hoặc effect chạy lại.
    let active = true;
    // Mỗi lần kiểm tra có một số thứ tự để bỏ qua response cũ về chậm hơn.
    let requestId = 0;

    const checkAccess = async () => {
      const currentRequest = ++requestId;
      const checkedToken = getStoredToken();
      // Không có phiên đăng nhập: cho guest đi tiếp. Guard riêng của trang con
      // vẫn chịu trách nhiệm yêu cầu đăng nhập nếu trang đó cần xác thực.
      if (!checkedToken) {
        setAccess({ token: null, status: 'allowed' });
        return;
      }

      setAccess({ token: checkedToken, status: 'loading' });
      // Chỉ nhận kết quả của request mới nhất và đúng phiên đang đăng nhập.
      const isCurrent = () =>
        active && currentRequest === requestId && checkedToken === getStoredToken();

      try {
        // getMe gửi JWT lên BE và lấy role từ tài khoản đã xác thực.
        // Không dùng role lưu trong localStorage để quyết định chuyển hướng.
        const user = await getMe();
        if (!isCurrent()) return;
        if (!user || typeof user.role !== 'string') {
          throw new Error('Thông tin tài khoản không hợp lệ.');
        }
        setAccess({ token: checkedToken, status: user.role === 'ADMIN' ? 'admin' : 'allowed' });
      } catch (error: unknown) {
        if (!isCurrent()) return;
        // 401 nghĩa là phiên không còn hợp lệ: cho đi tiếp để xem trang công khai
        // hoặc đăng nhập lại. Lỗi khác phải chờ thử lại, tránh cho admin lọt vào.
        setAccess({
          token: checkedToken,
          status: error instanceof ApiRequestError && error.status === 401 ? 'allowed' : 'error',
        });
      }
    };

    // Kiểm tra lại khi login/logout trong tab này hoặc token đổi ở tab khác.
    const syncAuth = () => void checkAccess();
    const syncStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'nexus:auth-token') syncAuth();
    };
    syncAuth(); // Kiểm tra ngay khi guard được mount, kể cả nhập URL trực tiếp.
    window.addEventListener('nexus:auth-change', syncAuth);
    window.addEventListener('storage', syncStorage);
    return () => {
      // Dọn listener và vô hiệu hóa các request còn đang chờ.
      active = false;
      window.removeEventListener('nexus:auth-change', syncAuth);
      window.removeEventListener('storage', syncStorage);
    };
  }, [retry]); // Nút "Thử lại" tăng retry để chạy lại quá trình xác minh.

  // Outlet là trang con khớp URL hiện tại trong AppRouter.
  if (!token) return <Outlet />;

  // Chưa có kết quả cho token hiện tại thì chưa mount trang con,
  // tránh hiện thoáng nội dung hoặc gọi API của trang trước khi chuyển hướng.
  if (access.token !== token || access.status === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
        <p role="status">Đang kiểm tra quyền truy cập…</p>
      </main>
    );
  }

  // Admin chỉ được ở /admin/*. replace thay URL hiện tại trong lịch sử,
  // để nút Back không quay lại đúng mục lịch sử vừa bị guard chuyển hướng.
  if (access.status === 'admin') return <Navigate to="/admin" replace />;

  // Chưa xác minh được role: hiện lỗi và cho thử lại, không render trang con.
  if (access.status === 'error') {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-50 p-6">
        <p role="alert">Không thể kiểm tra quyền truy cập. Vui lòng thử lại.</p>
        <button type="button" onClick={() => setRetry((value) => value + 1)}>
          Thử lại
        </button>
      </main>
    );
  }

  // Role khác ADMIN (hoặc phiên bị 401) đi tiếp tới guard/trang con tương ứng.
  return <Outlet />;
}
