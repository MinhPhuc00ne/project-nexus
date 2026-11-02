# AI hội thoại NEXUS

Chatbot dùng Gemini để tạo câu trả lời theo system prompt trong
`src/modules/chat/services/chatbot-system-prompt.ts` và kiến thức NEXUS trong
`src/modules/chat/services/chatbot-knowledge.ts`.

Cấu hình trong môi trường chạy backend rồi khởi động lại:

```dotenv
CHATBOT_AI_ENABLED=true
GEMINI_API_KEY=<khóa Gemini của bạn>
CHATBOT_GEMINI_MODEL=<model Gemini đang được tài khoản hỗ trợ>
```

Model phải có tên dạng `gemini-...` và hỗ trợ structured output.
Khi chưa cấu hình, Gemini lỗi, hết thời gian chờ hoặc trả dữ liệu không hợp lệ,
backend trả hướng dẫn FAQ dự phòng (`engine: "FAQ"`). Câu trả lời do AI tạo có
`engine: "GEMINI"`.

## API hội thoại

Chatbot chỉ hỗ trợ văn bản, không hỗ trợ upload hoặc phân tích ảnh/tệp đính kèm.
Các trường ảnh/tệp ngoài DTO bị API từ chối với HTTP 400. URL ảnh trong tin nhắn
chỉ được coi là văn bản; backend không tải ảnh từ URL đó để gửi Gemini.

- `POST /api/v1/chat/bot/messages`: cần Bearer token.
- `POST /api/v1/chat/bot/guest/messages`: khách chưa đăng nhập, chỉ hướng dẫn chung.
- Mỗi tài khoản/địa chỉ khách tối đa 20 yêu cầu/phút, kiểm soát qua Redis.

```json
{
  "message": "Shop xác nhận rồi, giờ tôi cần làm gì?",
  "history": [
    { "role": "user", "content": "Tôi muốn hủy đơn hàng" },
    { "role": "assistant", "content": "Shop đã xác nhận đơn của bạn chưa?" }
  ]
}
```

`history` là tùy chọn, tối đa 12 tin trước đó, mỗi tin tối đa 2000 ký tự.
Chỉ nhận role `user` hoặc `assistant`; không nhận system prompt từ client.
Backend không lưu hội thoại: bên gọi API gửi lịch sử khi cần câu hỏi tiếp nối.
Không đưa dữ liệu đơn hàng hay thông tin bí mật vào lịch sử. Lịch sử chỉ là
ngữ cảnh chưa xác minh, không được coi là nguồn chính sách hoặc quyền truy cập.
Tin có từ khóa bảo mật được xử lý bằng hướng dẫn cố định; các tin tương tự
trong lịch sử được che trước khi gửi Gemini.

API đăng nhập vẫn nhận `orderId` để tra cứu trạng thái trực tiếp từ database,
kiểm tra người mua/người bán và trả `engine: "ORDER"`. Nhánh này không gọi AI;
khách không được gửi `orderId`. AI không được cấp công cụ thay đổi dữ liệu.

Giữ nguyên cấu trúc response `reply`, `engine`, `topic`, `sources`, `actions`.
Backend chọn nguồn và hành động từ danh mục có sẵn, không dùng endpoint do AI sinh.
System prompt hướng dẫn hành vi; quyền truy cập đơn và các thao tác vẫn do backend kiểm soát.

## Kiểm tra

```sh
node --test backend/test/chatbot.test.mjs backend/test/chatbot-api.test.mjs
npm run build:backend
```

Các test mô phỏng phản hồi Gemini, không gọi API trả phí. Để kiểm tra chất lượng
hội thoại thực tế, cấu hình khóa/model hợp lệ và gọi API với lịch sử nhiều lượt.
