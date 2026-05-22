"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0a]",
  {
    variants: {
      variant: {
        primary:
          "bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-lg hover:shadow-red-500/25",
        secondary:
          "bg-[#1a1a1a] hover:bg-[#222] active:bg-[#111] border border-[#333] text-white",
        outline:
          "bg-transparent border border-red-600 text-red-500 hover:bg-red-600 hover:text-white",
        ghost:
          "bg-transparent text-gray-400 hover:text-white hover:bg-[#1a1a1a]",
        danger:
          "bg-red-900 hover:bg-red-800 border border-red-700 text-red-300",
      },
      size: {
        sm: "px-3 py-1.5 text-xs rounded-lg",
        md: "px-5 py-2.5 text-sm rounded-xl",
        lg: "px-8 py-3.5 text-base rounded-xl",
        xl: "px-10 py-4 text-lg rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonVariants({ variant, size, className })}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonProps };
