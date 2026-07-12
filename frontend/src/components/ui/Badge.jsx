import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Sparkles,
} from "lucide-react";

export default function Badge({
  children,
  tone = "info",
  className = "",
}) {
  const variants = {
    success: {
      style:
        "bg-emerald-50 text-emerald-700 border border-emerald-200",
      icon: CheckCircle2,
    },

    warning: {
      style:
        "bg-amber-50 text-amber-700 border border-amber-200",
      icon: AlertTriangle,
    },

    danger: {
      style:
        "bg-rose-50 text-rose-700 border border-rose-200",
      icon: XCircle,
    },

    info: {
      style:
        "bg-sky-50 text-sky-700 border border-sky-200",
      icon: Info,
    },

    neutral: {
      style:
        "bg-slate-100 text-slate-700 border border-slate-200",
      icon: Sparkles,
    },

    violet: {
      style:
        "bg-violet-50 text-violet-700 border border-violet-200",
      icon: Sparkles,
    },
  };

  const current = variants[tone] || variants.info;
  const Icon = current.icon;

  return (
    <motion.span
      whileHover={{ scale: 1.04 }}
      transition={{ duration: 0.2 }}
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-full
        px-3
        py-1.5
        text-xs
        font-semibold
        shadow-sm
        transition-all
        ${current.style}
        ${className}
      `}
    >
      <Icon size={13} />
      {children}
    </motion.span>
  );
}