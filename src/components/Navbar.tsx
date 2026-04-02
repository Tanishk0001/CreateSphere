import { Link } from "react-router-dom";
import { useAuth } from "../App";
import { motion } from "motion/react";
import { Sparkles, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 glass border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-brand-600 p-1.5 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-display font-bold tracking-tight">CreateSphere</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors">Home</Link>
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors">Pricing</a>
            
            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <button 
                  onClick={logout}
                  className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors">Login</Link>
                <Link 
                  to="/register" 
                  className="bg-brand-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-brand-700 transition-all shadow-lg shadow-brand-200"
                >
                  Get Started Free
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-600">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white border-b border-slate-200 px-4 py-4 space-y-4"
        >
          <Link to="/" className="block text-base font-medium text-slate-600" onClick={() => setIsOpen(false)}>Home</Link>
          <a href="#features" className="block text-base font-medium text-slate-600" onClick={() => setIsOpen(false)}>Features</a>
          <a href="#pricing" className="block text-base font-medium text-slate-600" onClick={() => setIsOpen(false)}>Pricing</a>
          {user ? (
            <>
              <Link to="/dashboard" className="block text-base font-medium text-slate-600" onClick={() => setIsOpen(false)}>Dashboard</Link>
              <button onClick={() => { logout(); setIsOpen(false); }} className="block text-base font-medium text-red-600">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block text-base font-medium text-slate-600" onClick={() => setIsOpen(false)}>Login</Link>
              <Link to="/register" className="block bg-brand-600 text-white px-4 py-2 rounded-full text-center font-semibold" onClick={() => setIsOpen(false)}>Get Started Free</Link>
            </>
          )}
        </motion.div>
      )}
    </nav>
  );
}
