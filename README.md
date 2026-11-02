# Project Nexus

Project Nexus is an enterprise full-stack platform combining traditional multi-shop e-commerce with real-time 3D live auctions. The repository is organized as an NPM Workspaces and Turborepo monorepo with symmetric package boundaries.

## 1. Công Nghệ Sử Dụng (Technology Stack)

| Tầng hệ thống          | Hạng mục công nghệ     | Công nghệ và phiên bản                             | Trách nhiệm chính                                             |
| :--------------------- | :--------------------- | :------------------------------------------------- | :------------------------------------------------------------ |
| Quản lý Monorepo       | Monorepo Workspaces    | npm workspaces and Turborepo                       | Điều phối pipeline build, lint, format và cache tác vụ        |
| Hợp đồng dùng chung    | Type-safe Contracts    | TypeScript ^5.9.3 (`@nexus/types`)                 | Nguồn chân lý duy nhất cho Enums, Events và DTOs              |
| Cấu hình dùng chung    | Shared Configurations  | `@nexus/config`                                    | Cung cấp cấu hình tsconfig.base đồng bộ toàn repository       |
| Dịch vụ máy chủ        | Backend Framework      | NestJS ^12.1.2                                     | Kiến trúc Modular Monolith Mức 1.5 với 10 module độc lập      |
| Cơ sở dữ liệu          | Database and ORM       | PostgreSQL 17 and Prisma ORM ^7.10.0               | Quản trị dữ liệu quan hệ, giao dịch ACID và schema migrations |
| Bộ nhớ đệm và Realtime | Cache and Event Engine | Redis 7 and Socket.IO ^4.8.4                       | Quản lý phiên, streaming WebSocket cho Chat và Live Auction   |
| Cổng thanh toán        | Payment Integrations   | PayOS VietQR, Ví NEXUS Pay and COD                 | Xử lý thanh toán đa kênh và giải ngân ký quỹ Escrow           |
| Đơn vị vận chuyển      | Logistics Integration  | GHN Express API                                    | Tự động tính cước, định vị địa chỉ và tạo vận đơn             |
| Giao diện người dùng   | Frontend Application   | React ^19.3.0, Vite ^8.3.4 and Tailwind CSS ^4.3.3 | Giao diện khách hàng, người bán, nhân viên và quản trị viên   |
| Hạ tầng phát triển     | Containerization       | Docker and Docker Compose                          | Môi trường container hóa với hai chế độ phát triển linh hoạt  |

## 2. Cấu Trúc Thư Mục Repository (Repository Structure)

```text
project-nexus/
├── .husky/                            # Git hooks tự động kiểm tra trước khi commit
├── .gitlab/                           # Mẫu Merge Request và cấu hình GitLab
├── .gitlab-ci.yml                     # Cấu hình pipeline CI/CD ba giai đoạn trên GitLab
├── docs/                              # Toàn bộ tài liệu kỹ thuật và tiêu chuẩn dự án
│   ├── api/                           # Đặc tả REST API và WebSocket contracts
│   ├── architecture/                  # Kiến trúc Modular Monolith, luật nghiệp vụ và mẫu thiết kế
│   ├── backend/                       # Cẩm nang phát triển dịch vụ NestJS và cơ sở dữ liệu
│   ├── frontend/                      # Cẩm nang phát triển giao diện React và luồng trạng thái
│   ├── srs/                           # Đặc tả yêu cầu phần mềm và luồng người dùng
│   └── standards/                     # Bộ quy chuẩn Clean Code, đặt tên và văn phong kỹ thuật
├── infra/                             # Cấu hình Dockerfiles và Docker Compose
├── packages/
│   ├── config/                        # Cấu hình TypeScript cơ sở dùng chung
│   └── types/                         # Thư viện hợp đồng kiểu dữ liệu (@nexus/types)
├── backend/                           # Ứng dụng máy chủ NestJS Modular Monolith
│   ├── prisma/                        # Schema Prisma, migrations và kịch bản khởi tạo seed
│   ├── src/                           # Các module nghiệp vụ (auth, users, catalog, commerce, auction...)
│   └── test/                          # Bộ kiểm thử đơn vị và kịch bản smoke test với node:test
├── frontend/                          # Ứng dụng giao diện khách hàng React 19 và Vite
│   ├── src/                           # Mã nguồn giao diện, layouts, routes và services
│   └── index.html                     # Điểm khởi đầu trang web
├── turbo.json                         # Cấu hình pipeline Turborepo
├── package.json                       # Định nghĩa npm workspaces và kịch bản thực thi toàn dự án
└── README.md                          # Hướng dẫn tổng quan và khởi chạy dự án
```

## 3. Hướng Dẫn Cài Đặt Và Khởi Chạy (Local Quick Start)

### Yêu cầu môi trường

- Node.js phiên bản 20.x trở lên
- npm phiên bản 10.x trở lên
- Docker và Docker Compose đã khởi động

### Các bước khởi chạy môi trường phát triển

Cài đặt toàn bộ dependencies trong monorepo:

```bash
npm install
```

Khởi động các dịch vụ phụ trợ nền tảng gồm PostgreSQL 17 và Redis 7:

```bash
npm run docker:infra
```

Sinh mã nguồn Prisma Client và nạp dữ liệu mẫu vào cơ sở dữ liệu:

```bash
npx prisma generate --schema=backend/prisma/schema.prisma
npx prisma migrate dev --schema=backend/prisma/schema.prisma
npm run db:seed
```

Khởi chạy đồng thời toàn bộ dịch vụ backend và frontend trên một tiến trình:

```bash
npm run dev
```

Cổng truy cập mặc định của các dịch vụ cục bộ:

- Cổng thông tin giao diện người dùng: `http://localhost:5173`
- Cổng dịch vụ máy chủ Backend REST API: `http://localhost:3000`
- Tài liệu tương tác Swagger API: `http://localhost:3000/api/docs`

### Chế độ khởi chạy toàn diện với Docker

Dành cho mục đích trình diễn hoặc kiểm thử độc lập mà không cần cài đặt Node.js cục bộ:

```bash
npm run docker:full
```

## 4. Tài Liệu Kỹ Thuật Chi Tiết

Để tra cứu các tài liệu chuyên sâu về kiến trúc, luật nghiệp vụ, giao thức bảo mật và quy chuẩn phát triển mã nguồn, vui lòng tham khảo [Cổng Tài Liệu Dự Án](docs/README.md).
