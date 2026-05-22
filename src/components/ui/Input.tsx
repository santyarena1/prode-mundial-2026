import { InputHTMLAttributes, ReactNode, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, hint, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-300 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full bg-[#111] border rounded-xl px-4 py-3 text-white placeholder-gray-600
              focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
              transition-all duration-200
              ${icon ? "pl-10" : ""}
              ${error ? "border-red-500" : "border-[#333] hover:border-[#444]"}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="text-red-400 text-xs mt-0.5">{error}</p>}
        {hint && !error && <p className="text-gray-500 text-xs mt-0.5">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
