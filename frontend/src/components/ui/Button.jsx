import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-5 py-3 text-sm",
    lg: "px-6 py-3.5 text-base",
  };

  const variants = {
    primary:
      "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md hover:shadow-xl hover:from-violet-700 hover:to-purple-700",

    secondary:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-violet-300",

    ghost:
      "bg-slate-100 text-slate-700 hover:bg-slate-200",

    danger:
      "bg-gradient-to-r from-rose-500 to-red-500 text-white hover:from-rose-600 hover:to-red-600 shadow-md",

    success:
      "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-md",
  };

  return (
    <motion.button
      whileHover={{
        y: -2,
        scale: 1.02,
      }}
      whileTap={{
        scale: 0.96,
      }}
      disabled={disabled || loading}
      className={`
        ${base}
        ${sizes[size]}
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <Loader2
          size={16}
          className="animate-spin"
        />
      )}

      {children}
    </motion.button>
  );
}