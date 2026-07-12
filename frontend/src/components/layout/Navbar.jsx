import { useState } from "react";
import {
  Bell,
  ChevronDown,
  Search,
  Sparkles,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="flex h-20 items-center justify-between px-8">

        {/* Left */}

        <div>

          <p className="text-sm font-semibold uppercase tracking-widest text-violet-600">
            Operations Center
          </p>

          <div className="mt-1 flex items-center gap-2 text-slate-500">

            <Sparkles size={15} className="text-violet-500" />

            <span className="text-sm">
              AssetFlow Enterprise Workspace
            </span>

          </div>

        </div>

        {/* Right */}

        <div className="flex items-center gap-5">

          {/* Search */}

          <div className="hidden lg:flex">

            <label className="flex w-80 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100">

              <Search
                size={18}
                className="text-slate-400"
              />

              <input
                placeholder="Search assets, employees..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />

            </label>

          </div>

          {/* Notification */}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md"
          >
            <Bell size={19} />

            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />

          </motion.button>

          {/* User */}

          <div className="relative">

            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => setOpen(!open)}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:shadow-md"
            >

              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-500 font-semibold text-white shadow">

                AD

              </div>

              <div className="hidden text-left lg:block">

                <p className="text-sm font-semibold text-slate-900">
                  Alicia Dean
                </p>

                <p className="text-xs text-slate-500">
                  System Administrator
                </p>

              </div>

              <ChevronDown
                size={18}
                className={`transition ${
                  open ? "rotate-180" : ""
                }`}
              />

            </motion.button>

            <AnimatePresence>

              {open && (

                <motion.div
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: 10,
                  }}
                  transition={{
                    duration: 0.18,
                  }}
                  className="absolute right-0 mt-3 w-60 rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl"
                >

                  <Link
                    to="/dashboard"
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >

                    <User size={17} />

                    Profile

                  </Link>

                  <Link
                    to="/notifications"
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >

                    <Bell size={17} />

                    Notifications

                  </Link>

                  <Link
                    to="/settings"
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >

                    <Settings size={17} />

                    Settings

                  </Link>

                  <hr className="my-2" />

                  <button
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >

                    <LogOut size={17} />

                    Sign Out

                  </button>

                </motion.div>

              )}

            </AnimatePresence>

          </div>

        </div>

      </div>
    </header>
  );
}