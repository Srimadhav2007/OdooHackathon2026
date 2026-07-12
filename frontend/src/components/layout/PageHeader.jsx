import { motion } from "framer-motion";
import { Sparkles, CalendarDays } from "lucide-react";

export default function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      {/* Background Glow */}

      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-200 opacity-20 blur-3xl" />

      <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">

        {/* Left */}

        <div>

          {eyebrow && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">

              <Sparkles size={15} />

              {eyebrow}

            </div>
          )}

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">

            {title}

          </h1>

          {description && (
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">
              {description}
            </p>
          )}

        </div>

        {/* Right */}

        <div className="flex flex-col items-end gap-4">

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">

            <CalendarDays size={16} />

            {today}

          </div>

          {actions && (
            <div className="flex flex-wrap justify-end gap-3">

              {actions}

            </div>
          )}

        </div>

      </div>
    </motion.div>
  );
}