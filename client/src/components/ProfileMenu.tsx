import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// TODO: make the ui consistent with the rest of the app
// TODO: fetch user name from backend
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
        className="w-10 h-10 rounded-full border-hairline flex items-center justify-center hover:bg-surface-container-low transition-colors"
      >
        <span className="material-symbols-outlined text-on-surface-variant">
          account_circle
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-surface-container-lowest border-hairline rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-4">
            {/* <p className="font-body-md text-body-md text-primary font-semibold">
              {user.name}
            </p> */}
            <p className="font-body-md text-sm text-on-surface-variant">
              {user.email}
            </p>
          </div>

          <div className="border-t border-hairline" />

          <div className="flex flex-col p-2">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/account");
              }}
              className="text-left px-3 py-2 rounded-lg font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
            >
              Account
            </button>
            <button
              onClick={() => {
                setOpen(false);
                logout();
                navigate("/");
              }}
              className="text-left px-3 py-2 rounded-lg font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
