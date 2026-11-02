import type { ToastItemProps } from '../../types/toast.types';
import ToastFrame from './ToastFrame';

export default function Success(props: ToastItemProps) {
  return <ToastFrame {...props} variant="success" />;
}
