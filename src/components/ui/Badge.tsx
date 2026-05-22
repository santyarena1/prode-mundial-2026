import { HTMLAttributes } from "react";

type BadgeVariant =
  | "points"
  | "position"
  | "gold"
  | "silver"
  | "bronze"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "default";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  points: "bg-yellow-900/40 border border-yellow-600/50 text-yellow-400",
  position: "bg-red-900/40 border border-red-600/50 text-red-400",
  gold: "bg-yellow-900/50 border border-yellow-500 text-yellow-300 font-bold",
  silver: "bg-gray-800/50 border border-gray-500 text-gray-300 font-bold",
  bronze: "bg-orange-900/50 border border-orange-600 text-orange-400 font-bold",
  success: "bg-green-900/40 border border-green-600/50 text-green-400",
  error: "bg-red-900/40 border border-red-600/50 text-red-400",
  warning: "bg-yellow-900/40 border border-yellow-600/50 text-yellow-400",
  info: "bg-blue-900/40 border border-blue-600/50 text-blue-400",
  default: "bg-[#222] border border-[#333] text-gray-400",
};

export function Badge({ variant = "default", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
