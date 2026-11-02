# Project Nexus - Documentation Portal

Welcome to the comprehensive technical documentation portal for Project Nexus — a high-performance, modular monolith platform for Luxury E-commerce and Realtime 3D Auctions.

## 1. Kiến Trúc Hệ Thống Và Đặc Tả Nghiệp Vụ

Tài liệu chi tiết trong thư mục `docs/architecture/`:

| Tài liệu                                                        | Mô tả tóm lược                                                                            | Phạm vi chính            |
| :-------------------------------------------------------------- | :---------------------------------------------------------------------------------------- | :----------------------- |
| [`ARCHITECTURE_MODEL.md`](./architecture/ARCHITECTURE_MODEL.md) | Kiến trúc Modular Monolith, lược đồ cơ sở dữ liệu Prisma và ranh giới giao dịch           | Backend và Cơ sở dữ liệu |
| [`BUSINESS_RULES.md`](./architecture/BUSINESS_RULES.md)         | Luật nghiệp vụ cốt lõi: vòng đời Escrow, đấu giá 3D realtime, anti-sniping và điểm uy tín | Logic nghiệp vụ          |
| [`DESIGN_PATTERNS.md`](./architecture/DESIGN_PATTERNS.md)       | Các mẫu thiết kế ứng dụng: Repository, Strategy, In-Process Event và Unit of Work         | Kiến trúc phần mềm       |

## 2. Tiêu Chuẩn Kỹ Thuật Và Quy Chuẩn Mã Nguồn

Tài liệu chi tiết trong thư mục `docs/standards/`:

| Tài liệu                                                     | Mô tả tóm lược                                                                               | Phạm vi chính       |
| :----------------------------------------------------------- | :------------------------------------------------------------------------------------------- | :------------------ |
| [`CLEAN_CODE.md`](./standards/CLEAN_CODE.md)                 | Quy chuẩn mã nguồn sạch: phân tách trách nhiệm, cấm comment dòng đơn vô nghĩa và chuẩn TSDoc | Chất lượng mã nguồn |
| [`WRITING_STYLE.md`](./standards/WRITING_STYLE.md)           | Quy chuẩn văn phong kỹ thuật: giọng văn trung lập, cấm in đậm giữa câu và quy định tài liệu  | Quy chuẩn tài liệu  |
| [`DESIGN_PRINCIPLES.md`](./standards/DESIGN_PRINCIPLES.md)   | Nguyên tắc thiết kế phần mềm: SOLID, KISS, YAGNI, DRY và kiểm soát độ ghép nối               | Nguyên lý kỹ thuật  |
| [`NAMING_CONVENTIONS.md`](./standards/NAMING_CONVENTIONS.md) | Quy ước đặt tên thống nhất cho TypeScript, React components, NestJS modules và cơ sở dữ liệu | Tính nhất quán      |

## 3. Cẩm Nang Kỹ Thuật Giao Diện Người Dùng (Frontend)

Tài liệu chi tiết trong thư mục `docs/frontend/`:

| Tài liệu                                                | Mô tả tóm lược                                                                               | Đối tượng độc giả |
| :------------------------------------------------------ | :------------------------------------------------------------------------------------------- | :---------------- |
| [`FRONTEND_GUIDE.md`](./frontend/FRONTEND_GUIDE.md)     | Cẩm nang phát triển giao diện: React 19, Vite, Tailwind CSS, Axios và dịch vụ thời gian thực | Kỹ sư Frontend    |
| [`UI_SPECIFICATION.md`](./frontend/UI_SPECIFICATION.md) | Đặc tả phân tầng giao diện, bảng màu, điểm ngắt responsive và cây định tuyến phân quyền      | UI và UX Designer |

## 4. Cẩm Nang Kỹ Thuật Dịch Vụ Máy Chủ (Backend)

Tài liệu chi tiết trong thư mục `docs/backend/`:

| Tài liệu                                         | Mô tả tóm lược                                                                              | Đối tượng độc giả |
| :----------------------------------------------- | :------------------------------------------------------------------------------------------ | :---------------- |
| [`BACKEND_GUIDE.md`](./backend/BACKEND_GUIDE.md) | Cẩm nang phát triển dịch vụ: NestJS 12, Prisma ORM 7, PostgreSQL, Redis, PayOS và WebSocket | Kỹ sư Backend     |

## 5. Đặc Tả Yêu Cầu Và Giao Diện Lập Trình (API & SRS)

- [Đặc Tả Yêu Cầu Phần Mềm (SRS)](./srs/README.md): Yêu cầu chức năng và phi chức năng cho hệ thống thương mại điện tử kết hợp đấu giá.
- [Chỉ Mục Đặc Tả API](./api/README.md): Danh mục các điểm cuối REST API và hợp đồng sự kiện WebSocket.
