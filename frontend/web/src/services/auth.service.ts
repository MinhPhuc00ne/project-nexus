import axios from 'axios';
import api from './api';

// Kiểu body backend trả về. Dữ liệu đăng ký nằm trong trường data.
interface RegisterResponse {
  data: {
    message: string;
    email: string;
    devOtpCode?: string;
  };
}

// Dấu ? nghĩa là trường có thể không tồn tại trong phản hồi lỗi.
interface ApiError {
  message?: string;
  errors?: string[];
}

// API này vừa đăng ký tài khoản chưa xác thực, vừa yêu cầu backend gửi OTP.
// async cho phép dùng await để chờ kết quả request trước khi cập nhật giao diện.
export const register = async (email: string, password: string, fullName: string) => {
  try {
    // Ghép baseURL + /auth/register; Axios tự chuyển object thành JSON.
    // Không cần token vì người dùng chưa đăng nhập.
    const response = await api.post<RegisterResponse>('/auth/register', {
      email,
      password,
      fullName,
    });

    // response.data là body HTTP; .data tiếp theo là dữ liệu backend đã bọc.
    return response.data.data;
  } catch (error) {
    // Axios tự báo lỗi khi HTTP thất bại (ví dụ 400), mất mạng hoặc timeout.
    if (axios.isAxiosError<ApiError>(error)) {
      const payload = error.response?.data;

      // Ưu tiên danh sách lỗi nhập liệu, rồi thông báo backend, rồi lỗi kết nối.
      // throw để catch trong RegisterPage nhận lỗi và hiển thị cho người dùng.
      throw new Error(
        payload?.errors?.join(' · ') || payload?.message || 'Không thể kết nối máy chủ.',
      );
    }

    throw error;
  }
};
