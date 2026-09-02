import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full glass-panel-subtle border border-white/20 flex items-center justify-center text-[#cbd5e1] hover:border-white/50 hover:bg-white/10 transition-all cursor-pointer shadow-sm"
      >
        <span className="material-symbols-outlined text-2xl">
          account_circle
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-64 glass-panel-silver border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden z-50 animate-fadeIn">
          <div className="p-4 border-b border-white/10">
            <p className="font-serif text-base text-[#f8f9fa] font-medium line-clamp-1">
              {user.name}
            </p>
            <p className="font-label-sm text-xs text-[#94a3b8] line-clamp-1">
              {user.email}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] uppercase tracking-wider text-[#cbd5e1]">
              <span className="material-symbols-outlined text-xs text-[#d4b068]">verified</span>
              Verified Member
            </div>
          </div>

          <div className="flex flex-col p-2 gap-1">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/listings");
              }}
              className="text-left px-3 py-2 rounded-xl font-label-sm text-xs uppercase tracking-widest text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">apartment</span>
              <span>All Residences</span>
            </button>

            <button
              onClick={() => {
                setOpen(false);
                navigate("/listings/new");
              }}
              className="text-left px-3 py-2 rounded-xl font-label-sm text-xs uppercase tracking-widest text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add_home</span>
              <span>Add Property</span>
            </button>

            <button
              onClick={() => {
                setOpen(false);
                navigate("/owner/applications");
              }}
              className="text-left px-3 py-2 rounded-xl font-label-sm text-xs uppercase tracking-widest text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">assignment</span>
              <span>Applications</span>
            </button>

            <button
              onClick={() => {
                setOpen(false);
                navigate("/onboarding");
              }}
              className="text-left px-3 py-2 rounded-xl font-label-sm text-xs uppercase tracking-widest text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">badge</span>
              <span>Role Onboarding</span>
            </button>

            <div className="h-px bg-white/10 my-1" />

            <button
              onClick={() => {
                setOpen(false);
                logout();
                navigate("/");
              }}
              className="text-left px-3 py-2 rounded-xl font-label-sm text-xs uppercase tracking-widest text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors cursor-pointer flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


