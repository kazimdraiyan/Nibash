import { Link, useLocation } from "react-router-dom";
import { ProfileMenu } from "./ProfileMenu";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const location = useLocation();
  const { token } = useAuth();

  return (
    <header className="bg-[#090a0c]/90 backdrop-blur-xl w-full h-20 border-b border-white/10 sticky top-0 z-50 transition-all duration-300">
      <div className="flex justify-between items-center px-container-padding max-w-[1440px] mx-auto w-full h-full">
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl glass-panel-silver border border-white/20 flex items-center justify-center text-[#f8fafc] group-hover:scale-105 transition-transform shadow-sm">
            <span className="material-symbols-outlined text-2xl text-[#cbd5e1]">
              castle
            </span>
          </div>
          <div>
            <span className="text-2xl font-serif font-bold text-[#f8f9fa] tracking-wide block leading-none">
              Nibash
            </span>
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#cbd5e1] font-label-sm block mt-1">
              Luxury Residences
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            to="/listings"
            className="text-xs uppercase tracking-widest font-label-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            Residences
          </Link>
          <a
            href="/#how-it-works"
            className="text-xs uppercase tracking-widest font-label-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            How It Works
          </a>
          <a
            href="/#locations"
            className="text-xs uppercase tracking-widest font-label-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            Neighborhoods
          </a>
          <a
            href="/#why-us"
            className="text-xs uppercase tracking-widest font-label-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            Why Nibash
          </a>
        </nav>

        {/* Action Buttons */}
        {token ? (
          <div className="flex items-center gap-3">
            <Link
              to="/listings/new"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest font-label-sm glass-button-silver text-[#090a0c] font-semibold hover:scale-105 transition-all shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              <span>Post a Listing</span>
            </Link>
            <ProfileMenu />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className={`px-4 py-2.5 rounded-xl font-label-sm text-xs uppercase tracking-widest transition-all cursor-pointer ${
                location.pathname === "/login"
                  ? "text-white font-semibold border-b border-white/80"
                  : "text-[#94a3b8] hover:text-white hover:bg-white/5"
              }`}
            >
              Log in
            </Link>

            <Link
              to="/register"
              className="glass-button-silver px-5 py-2.5 rounded-xl font-label-sm text-xs uppercase tracking-widest text-[#090a0c] shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}


