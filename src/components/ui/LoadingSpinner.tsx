interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-2",
  lg: "w-12 h-12 border-3",
  xl: "w-16 h-16 border-4",
};

export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  return (
    <div
      className={`rounded-full border-[#333] border-t-red-500 animate-spin ${sizeMap[size]} ${className}`}
    />
  );
}

export function LoadingScreen({ text = "Cargando..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-gray-500 text-sm uppercase tracking-wider">{text}</p>
    </div>
  );
}
