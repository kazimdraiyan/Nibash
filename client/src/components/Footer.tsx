import { Link } from "react-router-dom";

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-[#07080a] w-full pt-20 pb-12 border-t border-white/10 mt-auto text-[#f8f9fa] relative overflow-hidden">
      {/* Ambient background silver glow */}
      <div className="pointer-events-none absolute bottom-0 right-0 w-[500px] h-[300px] rounded-full bg-radial from-slate-400/8 via-transparent to-transparent blur-3xl" />

      <div className="max-w-[1440px] mx-auto px-container-padding grid grid-cols-1 md:grid-cols-12 gap-12 mb-16 relative z-10">
        {/* Brand Column */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <Link to="/" onClick={scrollToTop} className="flex items-center gap-3 w-fit group">
            <div className="w-10 h-10 rounded-xl glass-panel-silver border border-white/20 flex items-center justify-center text-[#f8fafc] group-hover:scale-105 transition-transform shadow-sm">
              <span className="material-symbols-outlined text-2xl text-[#cbd5e1]">castle</span>
            </div>
            <div>
              <span className="text-2xl font-serif font-bold text-white tracking-wide block leading-none">
                Nibash
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] text-[#cbd5e1] font-label-sm block mt-1">
                Luxury Residences
              </span>
            </div>
          </Link>

          <p className="text-sm text-[#94a3b8] leading-relaxed max-w-sm font-normal">
            Dhaka's premier residential leasing platform. Redefining modern renting
            through verified properties, digital contracts, and white-glove security.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <span className="glass-panel-subtle px-3 py-1 rounded-full text-xs text-[#cbd5e1] border border-white/10">
              100% NID Verified
            </span>
            <span className="glass-panel-subtle px-3 py-1 rounded-full text-xs text-white/80 border border-white/10">
              Digital Leases
            </span>
          </div>
        </div>

        {/* Column 2: Residences */}
        <div className="md:col-span-3 flex flex-col gap-4">
          <span className="font-label-sm text-xs uppercase tracking-widest text-[#cbd5e1] font-semibold">
            Featured Areas
          </span>
          <ul className="flex flex-col gap-2.5 text-sm text-[#94a3b8]">
            <li>
              <a href="#featured-properties" className="hover:text-white transition-colors">
                Gulshan Diplomatic Enclave
              </a>
            </li>
            <li>
              <a href="#featured-properties" className="hover:text-white transition-colors">
                Banani Lifestyle Suites
              </a>
            </li>
            <li>
              <a href="#featured-properties" className="hover:text-white transition-colors">
                Dhanmondi Lakeside Residences
              </a>
            </li>
            <li>
              <a href="#featured-properties" className="hover:text-white transition-colors">
                Baridhara DOHS Duplexes
              </a>
            </li>
            <li>
              <a href="#featured-properties" className="hover:text-white transition-colors">
                Bashundhara R/A Penthouses
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: Platform */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <span className="font-label-sm text-xs uppercase tracking-widest text-[#cbd5e1] font-semibold">
            Platform
          </span>
          <ul className="flex flex-col gap-2.5 text-sm text-[#94a3b8]">
            <li>
              <a href="#featured-properties" className="hover:text-white transition-colors">
                Browse Residences
              </a>
            </li>
            <li>
              <a href="#how-it-works" className="hover:text-white transition-colors">
                How It Works
              </a>
            </li>
            <li>
              <a href="#why-us" className="hover:text-white transition-colors">
                Trust & Verification
              </a>
            </li>
            <li>
              <Link to="/register" className="hover:text-white transition-colors">
                List a Property
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-white transition-colors">
                Tenant Portal
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 4: Legal & Contact */}
        <div className="md:col-span-3 flex flex-col gap-4">
          <span className="font-label-sm text-xs uppercase tracking-widest text-[#cbd5e1] font-semibold">
            Security & Support
          </span>
          <ul className="flex flex-col gap-2.5 text-sm text-[#94a3b8]">
            <li>
              <span className="hover:text-white transition-colors cursor-pointer">
                Terms of Tenancy Service
              </span>
            </li>
            <li>
              <span className="hover:text-white transition-colors cursor-pointer">
                NID Privacy & Encryption Policy
              </span>
            </li>
            <li>
              <span className="hover:text-white transition-colors cursor-pointer">
                Digital Agreement Standards
              </span>
            </li>
            <li>
              <span className="text-white/80 flex items-center gap-2 mt-2">
                <span className="material-symbols-outlined text-sm text-[#cbd5e1]">mail</span>
                concierge@nibash.com
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Copyright Row */}
      <div className="max-w-[1440px] mx-auto px-container-padding pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#94a3b8] font-label-sm">
        <div>
          © {new Date().getFullYear()} Nibash. All rights reserved. Crafted for modern luxury living.
        </div>
        <button
          onClick={scrollToTop}
          type="button"
          className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
        >
          <span>Back to Top</span>
          <span className="material-symbols-outlined text-sm">arrow_upward</span>
        </button>
      </div>
    </footer>
  );
}


