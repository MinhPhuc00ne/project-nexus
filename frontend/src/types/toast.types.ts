export interface ToastOptions {
  duration?: number;
  targetUrl?: string;
  onClick?: () => void;
  actionLabel?: string;
}

export interface ToastApi {
  success: (message: string, options?: ToastOptions) => number;
  error: (message: string, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
}

export interface ToastItem {
  id: number;
  message: string;
  variant: 'success' | 'error';
  duration: number;
  targetUrl?: string;
  onClick?: () => void;
  actionLabel?: string;
}

export interface ToastItemProps extends Omit<ToastItem, 'variant'> {
  onDismiss: (id: number) => void;
}
