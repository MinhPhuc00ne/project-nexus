import type { ToastItemProps } from '../../types/toast.types';
import ToastFrame from './ToastFrame';

export default function Fail(props: ToastItemProps) {
  return <ToastFrame {...props} variant="error" />;
}
