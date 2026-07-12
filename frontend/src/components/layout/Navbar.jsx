import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, User, Settings, LogOut, Command, ArrowRight, Laptop, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const navigate = useNavigate();

  // Listen for Cmd+K or Ctrl+K to open the Command Palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    // In a real app, clear JWT here
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
        
        {/* Search Bar / Command Palette Trigger */}
        <div className="flex flex-1 items-center">
          <button 
            onClick={() => setIsCommandOpen(true)}
            className="group relative flex w-full max-w-md items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-400 transition-colors hover:border-violet-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-violet-600"
          >
            <div className="flex items-center gap-2">
              <Search size={16} className="group-hover:text-violet-500" />
              <span>Search assets, employees, or press...</span>
            </div>
            <div className="flex items-center gap-1 rounded bg-white px-1.5 py-0.5 text-xs font-semibold shadow-sm border border-slate-200">
              <Command size={12} /> K
            </div>
          </button>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          <button className="relative rounded-full bg-slate-100 p-2.5 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900 focus:outline-none">
            <Bell size={18} />
            <span className="absolute right-1 top-1 flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 rounded-full focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-600 text-sm font-bold text-white shadow-sm">
                AD
              </div>
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl"
                >
                  <div className="border-b border-slate-100 px-3 py-2 mb-2">
                    <p className="text-sm font-semibold text-slate-900">Alicia Dean</p>
                    <p className="text-xs text-slate-500">System Administrator</p>
                  </div>
                  <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                    <User size={16} /> My Profile
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                    <Settings size={16} /> System Settings
                  </button>
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                    <LogOut size={16} /> Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {isCommandOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 pt-[10vh] backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center border-b border-slate-100 px-4 py-3">
                <Search size={20} className="text-slate-400" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="What do you need to find or do?" 
                  className="w-full bg-transparent px-4 py-2 text-lg text-slate-900 focus:outline-none"
                />
                <button onClick={() => setIsCommandOpen(false)} className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">ESC</button>
              </div>
              <div className="p-2">
                <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Actions</p>
                <button onClick={() => { setIsCommandOpen(false); navigate('/assets'); }} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700">
                  <div className="flex items-center gap-3"><Laptop size={18} /> Register New Asset</div>
                  <ArrowRight size={16} />
                </button>
                <button onClick={() => { setIsCommandOpen(false); navigate('/departments'); }} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700">
                  <div className="flex items-center gap-3"><Building2 size={18} /> Manage Organization Setup</div>
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}