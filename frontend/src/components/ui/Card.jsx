import { motion } from "framer-motion";

export default function Card({
  children,
  className = "",
  hover = true,
  glass = false,
  ...props
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        ease: "easeOut",
      }}
      whileHover={
        hover
          ? {
              y: -6,
              scale: 1.01,
            }
          : undefined
      }
      className={`
        relative
        overflow-hidden
        rounded-3xl
        border
        border-slate-200/80
        ${
          glass
            ? "bg-white/80 backdrop-blur-xl"
            : "bg-white"
        }
        shadow-sm
        transition-all
        duration-300
        hover:border-violet-200
        hover:shadow-2xl
        ${className}
      `}
      {...props}
    >
      {/* Decorative Glow */}

      <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-violet-200 opacity-10 blur-3xl transition-all duration-500 group-hover:opacity-20" />

      {/* Top Gradient Line */}

      <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-500" />

      {/* Content */}

      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}