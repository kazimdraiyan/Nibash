import { Link } from "react-router-dom";
import abidPhoto from "../assets/developers/abid-hossain.jpg";
import raiyanPhoto from "../assets/developers/kazi-md-raiyan.jpg";

interface Developer {
  name: string;
  idNumber: string;
  photoUrl: string;
  photoAlt: string;
}

const developers: Developer[] = [
  {
    name: "Abid Hossain",
    idNumber: "2405114",
    photoUrl: abidPhoto,
    photoAlt: "Abid Hossain",
  },
  {
    name: "Kazi Md Raiyan",
    idNumber: "2405103",
    photoUrl: raiyanPhoto,
    photoAlt: "Kazi Md Raiyan",
  },
];

export function AboutUsPage() {
  return (
    <div className="min-h-screen bg-[#090a0c] text-[#f8f9fa] pt-8 pb-24 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-radial from-slate-300/10 via-slate-500/5 to-transparent blur-3xl opacity-60" />
      <div className="pointer-events-none absolute top-1/3 right-0 w-[550px] h-[550px] rounded-full bg-radial from-white/8 via-slate-400/5 to-transparent blur-3xl opacity-50" />
      <div className="pointer-events-none absolute -bottom-32 left-1/4 w-[500px] h-[500px] rounded-full bg-radial from-slate-400/8 to-transparent blur-3xl opacity-40" />

      {/* Architectural grid background */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-container-padding">
        {/* Navigation Breadcrumb / Back button */}
        <div className="mb-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-label-sm text-[#94a3b8] hover:text-white transition-colors cursor-pointer group"
          >
            <span className="material-symbols-outlined text-base group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel-silver border border-white/15 mb-4">
            <span className="material-symbols-outlined text-xs text-[#cbd5e1]">
              code
            </span>
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-[#cbd5e1] font-semibold">
              The Engineering Team
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-[#f8f9fa] leading-[1.12] mb-4">
            Meet the{" "}
            <span className="font-serif italic font-normal text-silver-gradient-text">
              Developers
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[#94a3b8] font-normal leading-relaxed">
            The engineers behind Nibash, dedicated to creating Dhaka&apos;s most reliable, transparent, and seamless residential leasing platform.
          </p>
        </div>

        {/* Developer Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-12 md:gap-14 lg:gap-16 max-w-4xl mx-auto">
          {developers.map((dev) => (
            <div
              key={dev.idNumber}
              className="glass-panel rounded-3xl p-6 sm:p-7 pb-5 sm:pb-5 border border-white/10 hover:border-white/30 transition-all duration-500 hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85)] flex flex-col"
            >
              {/* 1. Developer Name */}
              <h2 className="text-2xl sm:text-3xl font-serif text-white tracking-wide">
                {dev.name}
              </h2>

              {/* 2. Roll Number (Number only, no label) */}
              <div className="mt-1 text-sm sm:text-base font-mono tracking-wider text-[#cbd5e1]">
                {dev.idNumber}
              </div>

              {/* 3. Developer Photograph (strictly below name and roll number) */}
              <div className="mt-5 w-full aspect-[4/4.2] max-h-[340px] overflow-hidden rounded-2xl border border-white/15 bg-[#12151c] relative group shadow-inner">
                <img
                  src={dev.photoUrl}
                  alt={dev.photoAlt}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090a0c]/60 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
