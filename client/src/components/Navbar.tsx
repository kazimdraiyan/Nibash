import { Link, useLocation } from "react-router-dom";
import { ProfileMenu } from "./ProfileMenu";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const location = useLocation();
  const { token, user } = useAuth();

  return (
    <header className="bg-[#090a0c]/90 backdrop-blur-xl w-full h-20 border-b border-white/10 sticky top-0 z-50 transition-all duration-300">
      <div className="flex justify-between items-center px-4 sm:px-6 lg:px-container-padding max-w-[1440px] mx-auto w-full h-full">
        {/* Brand Logo */}
        <Link
          to={user?.is_verifier ? "/verify/dashboard" : "/"}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
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
              Luxury Apartments
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation */}
        {!user?.is_verifier && (
          <nav className="hidden md:flex items-center gap-2.5 lg:gap-3.5 xl:gap-5 mx-1 lg:mx-3 shrink">
            <Link
              to="/listings"
              className={`text-[11px] xl:text-xs uppercase tracking-wider font-label-sm transition-colors whitespace-nowrap ${
                location.pathname === "/listings" && !location.search.includes("view=pending")
                  ? "text-white font-medium"
                  : "text-[#94a3b8] hover:text-white"
              }`}
            >
              Apartments
            </Link>
            <a
              href="/#how-it-works"
              className="text-[11px] xl:text-xs uppercase tracking-wider font-label-sm text-[#94a3b8] hover:text-white transition-colors whitespace-nowrap"
            >
              How It Works
            </a>
            <a
              href="/#locations"
              className="text-[11px] xl:text-xs uppercase tracking-wider font-label-sm text-[#94a3b8] hover:text-white transition-colors whitespace-nowrap"
            >
              Neighborhoods
            </a>
            <a
              href="/#why-us"
              className="text-[11px] xl:text-xs uppercase tracking-wider font-label-sm text-[#94a3b8] hover:text-white transition-colors whitespace-nowrap"
            >
              Why Nibash
            </a>
          </nav>
        )}

        {token ? (
          <div className="flex items-center gap-1.5 sm:gap-2 xl:gap-2.5 shrink-0">
            {user?.is_verifier ? (
              <>
                <Link
                  to="/verify/dashboard"
                  className={`flex items-center gap-1.5 px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-xl text-[11px] xl:text-xs uppercase tracking-wider font-label-sm transition-all border cursor-pointer whitespace-nowrap ${
                    location.pathname === "/verify/dashboard"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
                      : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400/50 hover:text-white"
                  }`}
                >
                  <span className="material-symbols-outlined text-base text-amber-400">monitoring</span>
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <Link
                  to="/listings?view=pending"
                  className={`flex items-center gap-1.5 px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-xl text-[11px] xl:text-xs uppercase tracking-wider font-label-sm transition-all border cursor-pointer whitespace-nowrap ${
                    location.pathname === "/listings" && location.search.includes("view=pending")
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
                      : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400/50 hover:text-white"
                  }`}
                >
                  <span className="material-symbols-outlined text-base text-amber-400">verified_user</span>
                  <span className="hidden sm:inline">Review Queue</span>
                </Link>
              </>
            ) : (
              <>
                {Boolean(user?.is_tenant || (user && localStorage.getItem(`nibash_tenant_${user.id}`) === "true")) && (
                  <Link
                    to="/my-contract"
                    className={`flex items-center gap-1.5 px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-xl text-[11px] xl:text-xs uppercase tracking-wider font-label-sm transition-all border cursor-pointer whitespace-nowrap ${
                      location.pathname === "/my-contract" || location.pathname.startsWith("/contracts/")
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                        : "bg-white/5 text-slate-300 border-white/10 hover:text-white hover:border-white/30 hover:bg-white/10"
                    }`}
                  >
                    <span className="material-symbols-outlined text-base text-emerald-400">description</span>
                    <span className="hidden sm:inline">My Contract</span>
                  </Link>
                )}
                <Link
                  to="/my-listings"
                  className={`flex items-center gap-1.5 px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-xl text-[11px] xl:text-xs uppercase tracking-wider font-label-sm transition-all border cursor-pointer whitespace-nowrap ${
                    location.pathname === "/my-listings"
                      ? "bg-[#d4b068]/15 text-[#d4b068] border-[#d4b068]/40"
                      : "bg-white/5 text-slate-300 border-white/10 hover:text-white hover:border-white/30 hover:bg-white/10"
                  }`}
                >
                  <span className="material-symbols-outlined text-base text-[#d4b068]">real_estate_agent</span>
                  <span className="hidden sm:inline">My Listings</span>
                </Link>
                <Link
                  to="/listings/new"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-xl text-[11px] xl:text-xs uppercase tracking-wider font-label-sm glass-button-silver text-[#090a0c] font-semibold hover:scale-105 transition-all shadow-sm cursor-pointer whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-base">add_circle</span>
                  <span>Post a Listing</span>
                </Link>
              </>
            )}
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


