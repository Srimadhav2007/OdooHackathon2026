import { motion } from "framer-motion";
import { CircleDollarSign, TrendingUp } from "lucide-react";


const toneStyles = {
  violet: {
    bg: "from-violet-500 to-purple-600",
    light: "bg-violet-50",
    text: "text-violet-700",
    bar: "bg-violet-500",
  },
  emerald: {
    bg: "from-emerald-500 to-green-600",
    light: "bg-emerald-50",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
  },
  amber: {
    bg: "from-amber-500 to-orange-500",
    light: "bg-amber-50",
    text: "text-amber-700",
    bar: "bg-amber-500",
  },
  sky: {
    bg: "from-sky-500 to-blue-600",
    light: "bg-sky-50",
    text: "text-sky-700",
    bar: "bg-sky-500",
  },
  rose: {
    bg: "from-rose-500 to-pink-600",
    light: "bg-rose-50",
    text: "text-rose-700",
    bar: "bg-rose-500",
  },
};

export default function StatCard({
  title,
  value,
  change,
  icon: Icon = CircleDollarSign,
  tone = "violet",
}) {
  const style = toneStyles[tone] || toneStyles.violet;

  return (
    <motion.div
      whileHover={{
        y: -6,
        scale: 1.02,
      }}
      transition={{
        duration: 0.25,
      }}
      className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-xl"
    >
      {/* Decorative Background */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-100 opacity-20 blur-3xl transition-all group-hover:scale-125" />

      <div className="relative z-10 flex items-start justify-between">
        <div>

          <p className="text-sm font-medium tracking-wide text-slate-500">
            {title}
          </p>

          <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
            {value}
          </h2>

        </div>

        <motion.div
          whileHover={{
            rotate: 8,
          }}
          className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${style.bg} text-white shadow-lg`}
        >
          <Icon size={24} />
        </motion.div>
      </div>

      {/* Bottom */}

      <div className="relative z-10 mt-6 flex items-center justify-between">

        <div className="flex items-center gap-2">

          <div className={`rounded-full p-1 ${style.light}`}>

            <TrendingUp
              size={14}
              className={style.text}
            />

          </div>

          <span className="text-sm font-medium text-slate-600">
            {change}
          </span>

        </div>

      </div>
    </motion.div>
  );
}