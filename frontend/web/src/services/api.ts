import axios from 'axios';

const api = axios.create({
  // URL gốc trong frontend/web/.env, ví dụ http://localhost:3000/api/v1.
  // Các service sẽ nối thêm đường dẫn như /auth/register vào URL này.
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, ''),
  // Chờ tối đa 20 giây; đây không phải thời hạn của mã OTP.
  timeout: 20000,
});

// Export để các service dùng chung cấu hình Axios.
export default api;
