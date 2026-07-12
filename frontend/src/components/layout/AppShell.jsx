import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex h-screen overflow-hidden">

        {/* Sidebar */}

        <Sidebar />

        {/* Main Area */}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* Navbar */}

          <Navbar />

          {/* Page Content */}

          <motion.main
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.35,
              ease: "easeOut",
            }}
            className="flex-1 overflow-y-auto"
          >
            <div className="mx-auto w-full max-w-[1700px] p-6 sm:p-8 lg:p-10">

              <Outlet />

            </div>
          </motion.main>

        </div>

      </div>
    </div>
  );
}