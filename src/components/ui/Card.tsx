import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  elevated?: boolean;
  children: React.ReactNode;
}

export function Card({ glow, elevated, className = "", children, ...props }: CardProps) {
  const base = "rounded-xl border transition-all duration-200";
  const bg = elevated ? "bg-[#1a1a1a]" : "bg-[#111111]";
  const border = glow
    ? "border-red-600/50 shadow-lg shadow-red-500/10"
    : "border-[#222222]";

  return (
    <div className={`${base} ${bg} ${border} ${className}`} {...props}>
      {children}
    </div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardHeader({ className = "", children, ...props }: CardHeaderProps) {
  return (
    <div className={`p-6 pb-0 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className = "", children, ...props }: CardHeaderProps) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = "", children, ...props }: CardHeaderProps) {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
}
