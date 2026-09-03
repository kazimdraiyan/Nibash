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
        className="w-10 h-10 rounded-full bg-[#dce0e6] border border-[#cbd2dc] flex items-center justify-center text-[#1e293b] hover:bg-[#cfd5df] transition-all cursor-pointer shadow-sm"
        aria-label="Open profile menu"
      >
        <span className="material-symbols-outlined text-2xl">
          account_circle
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-72 bg-[#e2e5ea] border border-[#b8bec9] rounded-2xl shadow-[0_16px_45px_rgba(0,0,0,0.3)] overflow-hidden z-50 animate-fadeIn text-[#0f172a]">
          {/* Profile Header — Solid Silver Banner */}
          <div className="p-4 bg-[#d0d5dc] border-b border-[#b8bec9]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#475569]">
                Profile
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e2e5ea] border border-[#b8bec9] text-[9px] uppercase tracking-wider font-semibold text-[#0f172a]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#b08d3e]" />
                Verified
              </span>
            </div>

            <p className="font-serif text-base font-bold text-[#0f172a] line-clamp-1">
              {user.name}
            </p>
            <p className="text-xs text-[#475569] line-clamp-1 font-mono mt-0.5">
              {user.email}
            </p>
            {user.phone && (
              <p className="text-[11px] text-[#64748b] font-mono mt-0.5">
                Tel: {user.phone}
              </p>
            )}
          </div>

          {/* Menu Actions */}
          <div className="flex flex-col p-2.5 gap-1 bg-[#e2e5ea]">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/listings");
              }}
              className="text-left px-3 py-2 rounded-xl text-xs uppercase tracking-wider text-[#334155] hover:text-[#0f172a] hover:bg-[#d0d5dc] transition-colors cursor-pointer flex items-center gap-2 font-medium"
            >
              <span className="material-symbols-outlined text-base">apartment</span>
              <span>All Residences</span>
            </button>

            <button
              onClick={() => {
                setOpen(false);
                navigate("/listings/new");
              }}
              className="text-left px-3 py-2 rounded-xl text-xs uppercase tracking-wider text-[#334155] hover:text-[#0f172a] hover:bg-[#d0d5dc] transition-colors cursor-pointer flex items-center gap-2 font-medium"
            >
              <span className="material-symbols-outlined text-base">add_home</span>
              <span>Post a Listing</span>
            </button>

            <button
              onClick={() => {
                setOpen(false);
                navigate("/owner/applications");
              }}
              className="text-left px-3 py-2 rounded-xl text-xs uppercase tracking-wider text-[#334155] hover:text-[#0f172a] hover:bg-[#d0d5dc] transition-colors cursor-pointer flex items-center gap-2 font-medium"
            >
              <span className="material-symbols-outlined text-base">assignment</span>
              <span>Applications</span>
            </button>

            <button
              onClick={() => {
                setOpen(false);
                navigate("/onboarding");
              }}
              className="text-left px-3 py-2 rounded-xl text-xs uppercase tracking-wider text-[#334155] hover:text-[#0f172a] hover:bg-[#d0d5dc] transition-colors cursor-pointer flex items-center gap-2 font-medium"
            >
              <span className="material-symbols-outlined text-base">badge</span>
              <span>Role Onboarding</span>
            </button>

            <div className="h-px bg-[#b8bec9] my-1" />

            <button
              onClick={() => {
                setOpen(false);
                logout();
                navigate("/");
              }}
              className="text-left px-3 py-2 rounded-xl text-xs uppercase tracking-wider text-red-700 hover:text-red-900 hover:bg-red-100 transition-colors cursor-pointer flex items-center gap-2 font-semibold"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
