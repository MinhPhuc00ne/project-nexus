# Project Nexus - API Specifications

This directory contains documentation and definitions for API endpoints (REST & WebSocket) for the entire Nexus system.

## API Design Standards

1. RESTful Conventions:

- Use plural nouns for resources (e.g., `/api/v1/auctions`, `/api/v1/products`).
- Use appropriate HTTP methods: `GET` (read), `POST` (create), `PUT` (full update), `PATCH` (partial update), `DELETE` (delete).
- Versioning: Always include the `/api/v1/` prefix in the URL.

1. WebSocket Contracts:

- Real-time gateway for auctions: `/ws/auctions`.
- Client-emitted events: `join_room`, `leave_room`, `place_bid`.
- Server-broadcasted events: `bid_placed`, `auction_time_extended`, `auction_ended`.

1. OpenAPI / Swagger:

- The NestJS monolithic backend automatically exposes the unified Swagger UI at `/api/docs` in the development environment.
