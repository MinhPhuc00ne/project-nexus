import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[background-color,color,border-color,box-shadow,translate] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 motion-safe:active:translate-y-px',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-white shadow-sm shadow-primary/15 hover:bg-primary-dark hover:shadow-md hover:shadow-primary/20',
        secondary: 'bg-blue-50 text-primary hover:bg-blue-100',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline:
          'border border-line bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50',
        ghost: 'text-slate-700 hover:bg-slate-100',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3 text-sm',
        lg: 'h-12 rounded-xl px-6',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
