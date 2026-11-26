/**
 * What settling a PayOS callback reports back to whoever dispatched it.
 *
 * PayOS sends one callback for both an order payment and a wallet top-up, so
 * two modules each try to claim it. Neither owns this shape, which is why it
 * sits with the PayOS client both of them already depend on.
 */
export interface PayosSettlement {
  success: boolean;
  orderCode?: number | string;
  message?: string;
}
