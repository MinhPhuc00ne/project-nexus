/**
 * One Socket.IO connection per namespace, however many parts of the page want it.
 *
 * Every caller used to open its own. A seller looking at their finance page
 * held three connections to `/ws/notifications` at once — the header's
 * notification dropdown, the seller notification hook, and the page itself —
 * and the chat widget held two to `/chat`, one for the room and one for the
 * unread badge. Each is a separate handshake, a separate room join on the
 * server, and a separate delivery of every event to the same browser. The
 * backend counts open sockets for its health report and derives who is online
 * from them, so the figures were wrong by however many tabs and panels a
 * person happened to have.
 *
 * A lease is handed out instead. The first one opens the connection, the last
 * one to be released closes it, and each lease removes only the handlers it
 * registered — so one panel unmounting cannot deafen another.
 */

/**
 * What the pool needs of a socket.
 *
 * Only `connected` is required of the caller's type: Socket.IO's typed socket
 * declares `on` and `off` over a union of its own event names, which no
 * loose signature here can satisfy. The pool calls those through
 * `SocketMethods` below, so the casting stays in this file and callers keep
 * their event types.
 */
export interface PoolableSocket {
  connected: boolean;
}

/** The same socket, seen loosely enough to subscribe and unsubscribe generically. */
interface SocketMethods {
  connect(): unknown;
  disconnect(): unknown;
  on(event: string, handler: (...args: never[]) => void): unknown;
  off(event: string, handler?: (...args: never[]) => void): unknown;
}

function methodsOf(socket: PoolableSocket): SocketMethods {
  return socket as unknown as SocketMethods;
}

/** What a factory hands the pool: the socket, and how to dismantle it. */
export interface PooledConnection<S extends PoolableSocket> {
  socket: S;
  /** Run once, when the last lease is released. */
  teardown: () => void;
}

interface PoolEntry<S extends PoolableSocket> {
  socket: S;
  teardown: () => void;
  leases: number;
}

const pool = new Map<string, PoolEntry<PoolableSocket>>();

/** A handler this lease registered, so it can be removed without touching others'. */
type Registration = [event: string, handler: (...args: never[]) => void];

/** What a caller holds: a socket of its own, as far as it can tell. */
export interface SocketLease<S extends PoolableSocket> {
  socket: S;
  connect: () => void;
  /** Releases this lease. The connection closes when the last one goes. */
  disconnect: () => void;
}

/**
 * Takes a lease on the connection for `key`, opening it if nobody holds one.
 *
 * @param key - Identifies the connection; one per namespace, per account.
 * @param create - Opens a new connection. Called only when there is none.
 * @returns A lease that behaves like a private socket.
 */
export function leaseSocket<S extends PoolableSocket>(
  key: string,
  create: () => PooledConnection<S>,
): SocketLease<S> {
  let entry = pool.get(key) as PoolEntry<S> | undefined;
  if (!entry) {
    const created = create();
    entry = { socket: created.socket, teardown: created.teardown, leases: 0 };
    pool.set(key, entry as PoolEntry<PoolableSocket>);
  }
  const shared = entry;
  shared.leases += 1;

  const registrations: Registration[] = [];
  let released = false;

  // A thin stand-in for the socket: it forwards everything, and remembers what
  // this lease subscribed to. `removeAllListeners` is the reason it exists —
  // several consumers call it on unmount, and on a shared socket that would
  // silence every other panel on the page.
  const socket = new Proxy(shared.socket, {
    get(target, property, receiver) {
      if (property === 'on' || property === 'once') {
        return (event: string, handler: (...args: never[]) => void) => {
          registrations.push([event, handler]);
          return methodsOf(target).on(event, handler);
        };
      }
      if (property === 'off') {
        return (event: string, handler?: (...args: never[]) => void) => {
          const index = registrations.findIndex(
            ([registeredEvent, registeredHandler]) =>
              registeredEvent === event && (!handler || registeredHandler === handler),
          );
          if (index >= 0) registrations.splice(index, 1);
          return methodsOf(target).off(event, handler);
        };
      }
      if (property === 'removeAllListeners') {
        return () => {
          removeOwnHandlers();
          return target;
        };
      }
      if (property === 'connect') return () => leaseConnect();
      if (property === 'disconnect') return () => leaseDisconnect();
      const value = Reflect.get(target, property, receiver) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as S;

  function removeOwnHandlers(): void {
    for (const [event, handler] of registrations.splice(0)) {
      methodsOf(shared.socket).off(event, handler);
    }
  }

  function leaseConnect(): void {
    // Already open for somebody else: joining is enough.
    if (!shared.socket.connected) methodsOf(shared.socket).connect();
  }

  function leaseDisconnect(): void {
    if (released) return;
    released = true;
    removeOwnHandlers();
    shared.leases -= 1;
    if (shared.leases > 0) return;
    pool.delete(key);
    shared.teardown();
    methodsOf(shared.socket).disconnect();
  }

  return { socket, connect: leaseConnect, disconnect: leaseDisconnect };
}

/**
 * Drops every pooled connection.
 *
 * For signing out, and for tests that must not carry a socket between cases.
 */
export function closeAllPooledSockets(): void {
  for (const [key, entry] of pool) {
    pool.delete(key);
    entry.teardown();
    methodsOf(entry.socket).disconnect();
  }
}
