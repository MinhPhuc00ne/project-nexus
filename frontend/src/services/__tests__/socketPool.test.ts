import { beforeEach, describe, expect, it, vi } from 'vitest';
import { closeAllPooledSockets, leaseSocket, type PoolableSocket } from '../socketPool';

/**
 * One connection per namespace, however many panels want it.
 *
 * Every caller used to open its own: a seller on the finance page held three
 * sockets to the notification namespace at once, and the chat widget held two.
 * Each is a handshake, a room join on the server, and another copy of every
 * event delivered to the same browser — and the backend derives who is online
 * from open sockets, so the counts were wrong by however many panels happened
 * to be mounted.
 */

interface FakeSocket extends PoolableSocket {
  connect: () => void;
  disconnect: () => void;
  on: (event: string, handler: (...args: never[]) => void) => void;
  off: (event: string, handler?: (...args: never[]) => void) => void;
  removeAllListeners: () => void;
  emitTo: (event: string, payload?: unknown) => void;
  handlers: Map<string, Array<(...args: never[]) => void>>;
}

let opened = 0;
let closed = 0;

function makeFakeSocket(): FakeSocket {
  const handlers = new Map<string, Array<(...args: never[]) => void>>();
  const socket: FakeSocket = {
    connected: false,
    handlers,
    connect() {
      socket.connected = true;
    },
    disconnect() {
      socket.connected = false;
      closed += 1;
    },
    on(event, handler) {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
    },
    off(event, handler) {
      const list = handlers.get(event) ?? [];
      handlers.set(event, handler ? list.filter((candidate) => candidate !== handler) : []);
    },
    removeAllListeners() {
      handlers.clear();
    },
    emitTo(event, payload) {
      for (const handler of handlers.get(event) ?? []) {
        (handler as (value?: unknown) => void)(payload);
      }
    },
  };
  return socket;
}

function factory() {
  opened += 1;
  const socket = makeFakeSocket();
  return { socket, teardown: () => undefined };
}

describe('pooled sockets', () => {
  beforeEach(() => {
    closeAllPooledSockets();
    opened = 0;
    closed = 0;
  });

  it('opens one connection however many leases are taken', () => {
    const header = leaseSocket<FakeSocket>('notifications:u-1', factory);
    const page = leaseSocket<FakeSocket>('notifications:u-1', factory);
    const widget = leaseSocket<FakeSocket>('notifications:u-1', factory);

    header.connect();
    page.connect();
    widget.connect();

    expect(opened).toBe(1);
    expect(header.socket.connected).toBe(true);
  });

  it('keeps a different account on its own connection', () => {
    leaseSocket<FakeSocket>('notifications:u-1', factory).connect();
    leaseSocket<FakeSocket>('notifications:u-2', factory).connect();

    expect(opened).toBe(2);
  });

  it('closes only when the last lease is released', () => {
    const header = leaseSocket<FakeSocket>('chat:u-1', factory);
    const widget = leaseSocket<FakeSocket>('chat:u-1', factory);
    header.connect();

    header.disconnect();
    expect(closed).toBe(0);
    expect(widget.socket.connected).toBe(true);

    widget.disconnect();
    expect(closed).toBe(1);
  });

  it('delivers an event once per lease, to that lease only', () => {
    const first = leaseSocket<FakeSocket>('chat:u-1', factory);
    const second = leaseSocket<FakeSocket>('chat:u-1', factory);
    const onFirst = vi.fn();
    const onSecond = vi.fn();
    first.socket.on('new_message', onFirst);
    second.socket.on('new_message', onSecond);
    first.connect();

    first.socket.emitTo('new_message', { id: 'm-1' });

    expect(onFirst).toHaveBeenCalledTimes(1);
    expect(onSecond).toHaveBeenCalledTimes(1);
  });

  it('releasing one lease does not deafen another', () => {
    const staying = leaseSocket<FakeSocket>('chat:u-1', factory);
    const leaving = leaseSocket<FakeSocket>('chat:u-1', factory);
    const onStaying = vi.fn();
    const onLeaving = vi.fn();
    staying.socket.on('new_message', onStaying);
    leaving.socket.on('new_message', onLeaving);
    staying.connect();

    leaving.disconnect();
    staying.socket.emitTo('new_message', { id: 'm-2' });

    expect(onLeaving).not.toHaveBeenCalled();
    expect(onStaying).toHaveBeenCalledTimes(1);
  });

  it('removeAllListeners from one panel leaves the others subscribed', () => {
    // Several components call this on unmount. On a shared socket the naive
    // forwarding would silence every other panel on the page.
    const tidy = leaseSocket<FakeSocket>('chat:u-1', factory);
    const other = leaseSocket<FakeSocket>('chat:u-1', factory);
    const onTidy = vi.fn();
    const onOther = vi.fn();
    tidy.socket.on('new_message', onTidy);
    other.socket.on('new_message', onOther);
    tidy.connect();

    tidy.socket.removeAllListeners();
    other.socket.emitTo('new_message', { id: 'm-3' });

    expect(onTidy).not.toHaveBeenCalled();
    expect(onOther).toHaveBeenCalledTimes(1);
  });

  it('a released lease cannot release the connection twice', () => {
    const only = leaseSocket<FakeSocket>('chat:u-1', factory);
    only.connect();

    only.disconnect();
    only.disconnect();

    expect(closed).toBe(1);
  });

  it('opens again after the last lease went away', () => {
    leaseSocket<FakeSocket>('chat:u-1', factory).disconnect();
    const later = leaseSocket<FakeSocket>('chat:u-1', factory);
    later.connect();

    expect(opened).toBe(2);
    expect(later.socket.connected).toBe(true);
  });
});
