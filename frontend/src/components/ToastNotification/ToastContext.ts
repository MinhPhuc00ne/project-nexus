import { createContext } from 'react';
import type { ToastApi } from '../../types/toast.types';

export const ToastContext = createContext<ToastApi | null>(null);
