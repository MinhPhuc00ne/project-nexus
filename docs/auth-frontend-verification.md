# Frontend authentication verification

## Setup

1. Install repository dependencies using `npm.cmd ci`.
2. Copy `.env.example` to `.env` and configure PostgreSQL, Redis, Google OAuth and SMTP with valid development credentials. Do not use example values as credentials.
3. Start PostgreSQL and Redis (`npm.cmd run docker:up` if Docker is available).
4. Generate the Prisma client using `npm.cmd run prisma:generate`. Apply the backend's migrations to your development database.
5. Start the backend with `npm.cmd run dev:backend`. Confirm Swagger is reachable at `http://localhost:3000/api/docs`.
6. If the backend URL differs, set `VITE_API_URL=http://localhost:3000/api/v1` in `frontend/web/.env.local` and restart Vite.
7. Start the frontend with `npm.cmd run dev:web`.

## Manual checks

- On `/register`, enter a name, a valid email and a password of at least six characters, accept the terms, and request an OTP. Invalid or incomplete details must not send a request.
- Verify `POST /api/v1/auth/register` sends only `email`, `password` and `fullName`. Inspect requests locally without sharing passwords or OTPs.
- Verify buttons are disabled during a request, then the resend button displays a 60-second countdown. This is a frontend convenience; backend rate limiting is still needed.
- Verify the OTP arrives by email. Check the spam folder. The backend code expires after ten minutes.
- Enter a wrong six-digit code. The backend error should be displayed without navigating away.
- Use “Sửa email hoặc thông tin đăng ký”. Edit the email, then request a new code after the cooldown. Verification must use the new email and code.
- After resending, only the latest OTP should work. Resending currently calls `register` again because there is no separate resend endpoint.
- Enter the correct code and verify `POST /api/v1/auth/verify-email` sends `email` and `code`. Success navigates to `/login`, prefills the email when browser storage is available, and displays a verification confirmation. The password is never saved in browser storage.
- On `/login`, verify incorrect credentials and an unverified account display backend errors. Valid credentials display the returned success message and name.
- Stop the backend and verify the form displays a connection error and enables retry. A request times out after 20 seconds.
- Google opens `/api/v1/auth/google`. Its callback currently returns JSON; completing a frontend session requires backend changes.

## Limits

The backend login response does not issue a token or session. A success message is not a persistent authenticated session. Search and auction data remain mocked until their APIs exist.

Production build: `npm.cmd run build --workspace=frontend/web`.
