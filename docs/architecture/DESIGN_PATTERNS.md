# Project Nexus - Design Patterns Specification

This document formalizes the software design patterns mandated across Project Nexus, encompassing both the backend Modular Monolith (NestJS) and client applications (React + Three.js). All engineers contributing to the codebase must adhere to these established patterns.

---

## 1. Backend Patterns

### 1.1. Dependency Injection (Inversion of Control - IoC)

- Purpose: Decouples component creation from usage, enabling robust unit testing through mocking/stubbing and achieving loose coupling.
- Rules:
  - Never instantiate stateful or I/O-bound dependencies (Repositories, HTTP Clients, Loggers) directly via the `new` keyword inside business services.
  - Declare dependencies through constructor parameters utilizing NestJS IoC containers or custom string/symbol tokens.
- Example:

  ```typescript
  @Injectable()
  export class PlaceBidService {
    constructor(
      private readonly auctionRepository: AuctionRepository,
      private readonly eventEmitter: EventEmitter2,
    ) {}
  }
  ```

---

### 1.2. Repository Pattern & Unit of Work (ACID Transactions)

- Purpose: Abstracts database operations and encapsulates query logic away from business services. In our monolithic architecture, PostgreSQL ACID transactions guarantee multi-step consistency without distributed transaction overhead.
- Rules:
  - Implement repository classes within each module to encapsulate Prisma database queries.
  - When executing multi-step interdependent database writes (e.g., deducting buyer wallet balance and creating an escrow record), use `prisma.$transaction()` to guarantee atomicity and rollback on error.
- Example:

  ```typescript
  @Injectable()
  export class EscrowTransactionService {
    constructor(private readonly prisma: PrismaService) {}

    async holdOrderFunds(orderId: string, buyerId: string, amount: number): Promise<void> {
      await this.prisma.$transaction(async (tx) => {
        // 1. Deduct wallet balance
        const user = await tx.user.update({
          where: { id: buyerId },
          data: { walletBalance: { decrement: amount } },
        });

        if (user.walletBalance.toNumber() < 0) {
          throw new InsufficientFundsException();
        }

        // 2. Create Escrow record
        await tx.escrowRecord.create({
          data: {
            orderId,
            amount,
            status: 'HELD',
          },
        });

        // 3. Mark order as PAID
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'PAID' },
        });
      });
    }
  }
  ```

---

### 1.3. Strategy Pattern (Payment & Logistics)

- Purpose: Enables switching third-party vendor algorithms or integrations dynamically at runtime without modifying core business logic (Open/Closed Principle).
- Use Cases in Nexus:
  - Payment Gateways: `PayOSPaymentStrategy` (domestic Vietnamese VietQR banking) and `StripePaymentStrategy` (international credit cards).
  - Logistics: `GhnShippingStrategy` (Giao Hàng Nhanh) and future providers (e.g., GHTK, ViettelPost).
- Example:

  ```typescript
  export interface IPaymentStrategy {
    readonly provider: 'PAYOS' | 'STRIPE';
    createPaymentLink(order: OrderDto): Promise<PaymentLinkResult>;
    verifyWebhook(payload: unknown, signature: string): Promise<PaymentWebhookResult>;
  }

  @Injectable()
  export class PaymentContextService {
    private readonly strategies: Map<string, IPaymentStrategy> = new Map();

    constructor(strategies: IPaymentStrategy[]) {
      strategies.forEach((s) => this.strategies.set(s.provider, s));
    }

    getStrategy(provider: 'PAYOS' | 'STRIPE'): IPaymentStrategy {
      const strategy = this.strategies.get(provider);
      if (!strategy) {
        throw new UnsupportedPaymentProviderException(provider);
      }
      return strategy;
    }
  }
  ```

---

### 1.4. In-Process Observer & Domain Events Pattern

- Purpose: Allows decoupled asynchronous notifications between monolithic modules without creating circular dependencies.
- Implementation:
  - Uses `@nestjs/event-emitter` (`EventEmitter2`).
  - When an event occurs in one module, it emits a domain event payload:

    ```typescript
    this.eventEmitter.emit(
      'order.created',
      new OrderCreatedEvent(order.id, order.buyerId, order.totalAmount),
    );
    ```

  - Other modules listen using the `@OnEvent()` decorator:

    ```typescript
    @OnEvent('order.created')
    async handleOrderCreated(event: OrderCreatedEvent) {
      await this.escrowService.createEscrowHold(event.orderId, event.amount);
    }
    ```

---

### 1.5. Real-Time Distributed Lock & Pub-Sub Pattern (Auction Engine)

- Purpose: Serializes concurrent bids and broadcasts updates to connected live auction participants with sub-10ms latency.
- Implementation:
  - `AuctionModule` receives incoming bids $\rightarrow$ Obtains a Redis lock (`Redlock`) to eliminate concurrent double-bids.
  - Commits the validated bid into PostgreSQL.
  - Broadcasts the update via WebSocket Gateway to all connected clients in the auction room (`auction:bid:placed`).

---

## 2. Frontend Patterns (React + Three.js)

### 2.1. Container-Presenter & Custom Hooks Pattern

- Purpose: Completely isolates business logic, API communication, and state management (Custom Hooks) from rendering concerns (Presentational Components).
- Rules:
  - Encapsulate all WebSocket events, auction countdown countdown timers, and bidding logic inside dedicated custom hooks (e.g., `useLiveAuction(auctionId)`).
  - Presentational UI components (`AuctionBidBoard.tsx`, `AuctionTimer.tsx`) must receive pure props and render interface elements without embedding side-effecting API hooks directly.

---

### 2.2. Three.js Scene Lifecycle & Asset Manager Pattern

- Purpose: Governs the loading, rendering, and systematic disposal of 3D assets (Models, Geometries, Materials, Textures, Shaders) to avoid client-side browser memory leaks.
- Rules:
  1. Singleton Asset Cache: Caches fetched `.glb`/`.gltf` model buffers to enable instant re-rendering across transitions.
  2. Lifecycle Cleanup: Ensures all scene objects, animations, and WebGL contexts are disposed when components unmount:

  ```typescript
  // frontend/web/src/features/auction/components/ThreeCanvas.tsx
  useEffect(() => {
    const sceneManager = new AuctionSceneManager(canvasRef.current);
    sceneManager.init(itemModelUrl);

    return () => {
      sceneManager.dispose(); // Explicitly disposes geometries, textures, and renderer
    };
  }, [itemModelUrl]);
  ```

- Fallback Pattern: Utilizes the Null Object / Fallback pattern: if no 3D asset matches the item among the 15 hardcoded models, the renderer transitions to a default 3D pedestal (`fallback-pedestal.glb`) textured with the seller's 2D photos.

---

### 2.3. Compound Components Pattern (Complex UI Layouts)

- Purpose: Construct flexible, cohesive component hierarchies that implicitly share state via React Context (e.g., `LiveAuctionRoom`, `Modal`, `Accordion`).
- Example:

  ```tsx
  <LiveAuctionRoom auctionId="auc-123">
    <LiveAuctionRoom.WebGLViewer />
    <LiveAuctionRoom.Timer />
    <LiveAuctionRoom.BidHistory />
    <LiveAuctionRoom.BidControls />
  </LiveAuctionRoom>
  ```
