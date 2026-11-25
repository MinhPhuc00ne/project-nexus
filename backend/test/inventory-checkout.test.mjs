import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test, mock } from 'node:test';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});

const load = createRequire(import.meta.url);
const { InventoryService } = load('../src/modules/catalog/services/inventory.service.ts');

test('InventoryService.reserveStock deducts availableQty and increases reservedQty, creating reservation & ledger', async () => {
  const inventory = {
    id: 'inv-1',
    productId: 'prod-1',
    warehouseId: 'WH_001',
    totalQty: 10,
    availableQty: 10,
    reservedQty: 0,
  };

  const reservations = [];
  const ledgers = [];

  const tx = {
    inventory: {
      findFirst: async () => inventory,
      update: mock.fn(async ({ data }) => {
        if (data.availableQty?.decrement) {
          inventory.availableQty -= data.availableQty.decrement;
        }
        if (data.reservedQty?.increment) {
          inventory.reservedQty += data.reservedQty.increment;
        }
        return inventory;
      }),
    },
    inventoryReservation: {
      create: mock.fn(async ({ data }) => {
        reservations.push(data);
        return { id: 'res-1', ...data };
      }),
    },
    inventoryLedger: {
      create: mock.fn(async ({ data }) => {
        ledgers.push(data);
        return { id: 'led-1', ...data };
      }),
    },
  };

  const inventoryService = new InventoryService({});
  const result = await inventoryService.reserveStock(tx, 'prod-1', 3, 'order-123');

  assert.equal(result.availableQty, 7);
  assert.equal(result.reservedQty, 3);
  assert.equal(reservations.length, 1);
  assert.equal(reservations[0].quantity, 3);
  assert.equal(reservations[0].referenceId, 'order-123');
  assert.equal(reservations[0].status, 'PENDING');
  assert.equal(ledgers.length, 1);
  assert.equal(ledgers[0].changeQty, -3);
  assert.equal(ledgers[0].balanceAfter, 7);
  assert.equal(ledgers[0].reason, 'ORDER_CHECKOUT');
});

test('InventoryService.reserveStock throws when availableQty is insufficient', async () => {
  const inventory = {
    id: 'inv-1',
    productId: 'prod-1',
    warehouseId: 'WH_001',
    totalQty: 2,
    availableQty: 2,
    reservedQty: 0,
  };

  const tx = {
    inventory: {
      findFirst: async () => inventory,
    },
  };

  const inventoryService = new InventoryService({});
  await assert.rejects(
    inventoryService.reserveStock(tx, 'prod-1', 5, 'order-456'),
    (err) => err.getStatus() === 400 && err.message.includes('không đủ'),
  );
});

test('InventoryService.commitReservation deducts totalQty and reservedQty on payment', async () => {
  const inventory = {
    id: 'inv-1',
    productId: 'prod-1',
    totalQty: 10,
    availableQty: 7,
    reservedQty: 3,
  };

  const reservation = {
    id: 'res-1',
    inventoryId: 'inv-1',
    quantity: 3,
    referenceId: 'order-123',
    status: 'PENDING',
  };

  const ledgers = [];

  const tx = {
    inventoryReservation: {
      findMany: async () => [reservation],
      update: mock.fn(async ({ data }) => Object.assign(reservation, data)),
    },
    inventory: {
      update: mock.fn(async ({ data }) => {
        if (data.totalQty?.decrement) {
          inventory.totalQty -= data.totalQty.decrement;
        }
        if (data.reservedQty?.decrement) {
          inventory.reservedQty -= data.reservedQty.decrement;
        }
        return inventory;
      }),
    },
    inventoryLedger: {
      create: mock.fn(async ({ data }) => {
        ledgers.push(data);
        return { id: 'led-2', ...data };
      }),
    },
  };

  const inventoryService = new InventoryService({});
  await inventoryService.commitReservation(tx, 'order-123');

  assert.equal(inventory.totalQty, 7);
  assert.equal(inventory.reservedQty, 0);
  assert.equal(reservation.status, 'COMMITTED');
  assert.equal(ledgers.length, 1);
  assert.equal(ledgers[0].reason, 'ORDER_PAID');
});

test('InventoryService.releaseReservation restores availableQty and cancels reservation on order cancellation', async () => {
  const inventory = {
    id: 'inv-1',
    productId: 'prod-1',
    totalQty: 10,
    availableQty: 7,
    reservedQty: 3,
  };

  const reservation = {
    id: 'res-1',
    inventoryId: 'inv-1',
    quantity: 3,
    referenceId: 'order-123',
    status: 'PENDING',
  };

  const ledgers = [];

  const tx = {
    inventoryReservation: {
      findMany: async () => [reservation],
      update: mock.fn(async ({ data }) => Object.assign(reservation, data)),
    },
    inventory: {
      update: mock.fn(async ({ data }) => {
        if (data.availableQty?.increment) {
          inventory.availableQty += data.availableQty.increment;
        }
        if (data.reservedQty?.decrement) {
          inventory.reservedQty -= data.reservedQty.decrement;
        }
        return inventory;
      }),
    },
    inventoryLedger: {
      create: mock.fn(async ({ data }) => {
        ledgers.push(data);
        return { id: 'led-3', ...data };
      }),
    },
  };

  const inventoryService = new InventoryService({});
  await inventoryService.releaseReservation(tx, 'order-123');

  assert.equal(inventory.availableQty, 10);
  assert.equal(inventory.reservedQty, 0);
  assert.equal(reservation.status, 'RELEASED');
  assert.equal(ledgers.length, 1);
  assert.equal(ledgers[0].reason, 'ORDER_CANCELLED');
});
