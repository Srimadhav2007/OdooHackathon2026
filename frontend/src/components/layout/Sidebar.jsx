import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { navigationItems } from "../../theme";

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const groups = useMemo(() => navigationItems, []);

  const SidebarItem = ({ item }) => {
    const Icon = item.icon;

    return (
      <NavLink
        to={item.path}
        key={item.path}
        onClick={() => setMobileOpen(false)}
        className={({ isActive }) =>
          `
          relative flex items-center gap-3 rounded-xl px-3 py-3
          transition-all duration-300
          ${
            collapsed ? "justify-center px-2" : ""
          }
          ${
            isActive
              ? "bg-violet-100 text-violet-700 shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }
        `
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-violet-600"
              />
            )}

            <motion.div whileHover={{ x: 2 }}>
              <Icon
                size={20}
                className={
                  isActive ? "text-violet-700" : "text-slate-500"
                }
              />
            </motion.div>

            {!collapsed && (
              <span className="font-medium">
                {item.label}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-xl bg-white p-2 shadow-lg lg:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
        fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white shadow-xl transition-all duration-300
        lg:static lg:h-screen lg:shrink-0
        ${collapsed ? "w-24" : "w-72"}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        {/* Header */}
        <div className="border-b border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 text-white shadow-lg">
                <Sparkles size={20} />
              </div>

              {!collapsed && (
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-bold text-slate-900">
                    AssetFlow
                  </h1>
                  <p className="truncate text-xs text-slate-500">
                    Enterprise ERP
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden shrink-0 rounded-xl p-2 hover:bg-slate-100 lg:block"
            >
              {collapsed ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronLeft size={18} />
              )}
            </button>

            <button
              onClick={() => setMobileOpen(false)}
              className="shrink-0 rounded-xl p-2 hover:bg-slate-100 lg:hidden"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {groups.map((group) => (
            <div key={group.title} className="mb-8">
              {!collapsed && (
                <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {group.title}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <SidebarItem key={item.path} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-5">
          <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 p-4 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 font-bold">
                AD
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">
                    Alicia Dean
                  </h3>
                  <p className="truncate text-xs text-violet-100">
                    Administrator
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}