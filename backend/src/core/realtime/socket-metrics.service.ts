import { Injectable } from '@nestjs/common';

/** Reports how many clients one namespace currently holds. */
export type ConnectedClientsProbe = () => number;

/**
 * Counts live WebSocket clients across every namespace.
 *
 * Each gateway registers a probe for its own namespace instead of the health
 * check importing the gateways, which would make a core concern depend on three
 * domain modules.
 */
@Injectable()
export class SocketMetricsService {
  private readonly probes = new Map<string, ConnectedClientsProbe>();

  /**
   * Registers a namespace's client counter, replacing any earlier one.
   *
   * @param namespace - The namespace name, used so a re-init does not double count.
   * @param probe - Reads the current client count.
   * @returns Completion.
   */
  register(namespace: string, probe: ConnectedClientsProbe): void {
    this.probes.set(namespace, probe);
  }

  /**
   * Registers a namespace by handing over its socket.io server object.
   *
   * Nest types a namespaced @WebSocketServer() as `Server` but injects a
   * `Namespace` at runtime. On a Namespace `sockets` is the client map; on a
   * Server it is the root namespace holding that map. Both shapes are read here
   * so a gateway does not have to care which it was given.
   *
   * @param namespace - The namespace name.
   * @param server - The injected socket.io server or namespace.
   * @returns Completion.
   */
  registerServer(namespace: string, server: unknown): void {
    this.register(namespace, () => {
      const sockets = (server as { sockets?: unknown } | null | undefined)?.sockets;
      if (sockets instanceof Map) return sockets.size;
      const nested = (sockets as { sockets?: unknown } | null | undefined)?.sockets;
      return nested instanceof Map ? nested.size : 0;
    });
  }

  /**
   * Counts clients connected across all registered namespaces.
   *
   * @returns The total, skipping any namespace whose probe fails.
   */
  connectedClients(): number {
    let total = 0;
    for (const probe of this.probes.values()) {
      try {
        const count = probe();
        if (Number.isFinite(count) && count > 0) total += count;
      } catch {
        // A namespace that cannot be counted contributes nothing rather than
        // failing the whole health check.
      }
    }
    return total;
  }
}
