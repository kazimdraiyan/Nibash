interface NavbarProps {
  currentView?: "home" | "login" | "register";
  onNavigate?: (view: "home" | "login" | "register") => void;
}

export function Navbar({ currentView = "home", onNavigate }: NavbarProps) {
  const handleNav = (view: "home" | "login" | "register") => {
    if (onNavigate) {
      onNavigate(view);
    }
  };

  return (
    <header className="bg-surface dark:bg-surface w-full h-20 border-b border-outline-variant dark:border-outline flat no shadows sticky top-0 z-50">
      <div className="flex justify-between items-center px-container-padding max-w-[1440px] mx-auto w-full h-full">
        
        {/* Brand Logo */}
        <button
          onClick={() => handleNav("home")}
          className="flex items-center gap-2 text-headline-md font-headline-md font-bold text-primary dark:text-on-primary-fixed cursor-pointer transition-opacity hover:opacity-90"
        >
          Nibash
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleNav("login")}
            className={`font-label-sm text-label-sm uppercase cursor-pointer transition-all pb-0.5 ${
              currentView === "login"
                ? "text-primary font-bold border-b-2 border-primary"
                : "text-primary border-b border-primary hover:border-b-2"
            }`}
          >
            Log in
          </button>

          <button
            onClick={() => handleNav("register")}
            className={`px-6 py-3 rounded-lg font-label-sm text-label-sm uppercase tracking-widest transition-all cursor-pointer ${
              currentView === "register"
                ? "bg-surface-container-low text-primary border border-primary font-bold"
                : "bg-primary text-on-primary hover:bg-surface-container-low dark:hover:bg-surface-container-highest hover:text-primary active:scale-95 hover:border border"
            }`}
          >
            Get Started
          </button>
        </div>

      </div>
    </header>
  );
}