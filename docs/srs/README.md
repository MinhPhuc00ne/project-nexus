# Software Requirements Specification

## 1. Introduction

### 1.1 Purpose

The purpose of this document is to define the software requirements for Project Nexus, a comprehensive e-commerce and real-time 3D auction platform. This document serves as the foundational agreement between stakeholders and the development team.

### 1.2 Intended Audience

This SRS is intended for developers, project managers, QA testers, and stakeholders to understand the system's intended capabilities, constraints, and operational environment.

### 1.3 Project Scope

Project Nexus aims to merge traditional e-commerce with real-time bidding mechanics. It allows users to seamlessly switch between buying and selling, features a real-time 3D WebGL showcase for auction items, implements a robust escrow payment system to prevent fraud, and relies on a dynamic reputation scoring system to govern user capabilities.

## 2. Overall Description

### 2.1 Product Perspective

Nexus is architected as a Modular Monolith application. It comprises responsive client applications (`frontend/web` and `frontend/admin`) and a unified backend application (`backend/`) structured into decoupled domain modules operating in a single NestJS runtime. Inter-module communication occurs via in-process events and direct service injection, backed by a unified PostgreSQL database and Redis for in-memory queues, distributed locks, and real-time WebSocket state synchronization.

### 2.2 User Classes and Characteristics

- Guest: Unregistered users who can browse catalogs, view live auctions, and maintain a temporary cart.
- Buyer: Registered users who can purchase items, participate in auctions (bidding), cancel orders (with restrictions), and report issues.
- Seller: An extension of the Buyer account. Users toggle between modes seamlessly. Sellers can manage inventory, dispatch orders, and submit items for auction.
- Staff: Platform moderators who handle user disputes, track shipments, monitor system health, and manage refunds.
- Admin: Superusers capable of creating staff accounts, banning users, triggering live auctions, and withdrawing platform revenues.

### 2.3 Operating Environment

- The frontend will be a responsive web application operating on modern web browsers (Chrome, Safari, Edge, Firefox).
- The 3D showcase requires WebGL support on the client's device.
- The backend will run in containerized Linux environments (Docker / Cloud VM).

## 3. System Features

### 3.1 Identity and Access Management

- Description: Centralized management of user accounts, authentication (JWT), authorization (RBAC), and wallet balances.
- Functional Requirements:
  - The system must provide a unified login for Buyers and Sellers, utilizing a UI toggle to switch contexts without re-authenticating.
  - The system must manage a user's wallet (deposit and withdrawal).
  - The system must enforce a Reputation mechanism (starting at 100 points, penalized for order cancellations or bidding defaults).

### 3.2 E-Commerce & Logistics

- Description: Traditional marketplace functionalities.
- Functional Requirements:
  - The system must integrate with GHN (Giao Hàng Nhanh) for dynamic shipping fee calculation based on weight and distance.
  - The system must support PayOS for domestic payments and Stripe for international transactions.
  - Escrow System: The system must hold buyer funds in escrow upon purchase. Funds are released to the Seller (minus a 7% platform fee) only after the buyer confirms receipt of the item without filing a dispute.

### 3.3 Real-time 3D Auction Engine

- Description: A live bidding environment featuring 3D item rendering and concurrent bid processing.
- Functional Requirements:
  - 3D Showcase: During a live auction, the system must display the item in 3D.
    - The system will provide 15 hardcoded 3D models (e.g., car, painting) for matched items.
    - For unmatched items, the system must use a fallback generic 3D exhibition frame mapped with 2D images uploaded by the seller.
  - Atomic Bidding: The system must process bids atomically. When a bid is placed, the amount is immediately deducted from the Buyer's wallet. If outbid, the system must instantly refund the previous highest bidder and deduct from the new highest bidder.
  - Anti-Sniping: The system must automatically extend the auction duration by 5 minutes if a valid bid is placed within the final 2 minutes of the auction clock.

## 4. Non-Functional Requirements

### 4.1 Performance & Scalability

- The auction engine must handle high-concurrency bidding without race conditions, utilizing Redis locks (Redlock) and in-memory atomic queues to serialize incoming bids.
- The modular monolithic backend simplifies deployment and eliminates inter-service network overhead while maintaining high throughput.

### 4.2 Security

- All sensitive API endpoints must be protected via JWT authentication and role-based access control.
- Payment processing and escrow management must enforce strict transactional integrity via PostgreSQL ACID transactions.
