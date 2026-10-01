import { Link } from "react-router-dom";
import abidPhoto from "../assets/developers/abid-hossain.jpg";
import raiyanPhoto from "../assets/developers/kazi-md-raiyan.jpg";
import teamWorkingPhoto from "../assets/developers/team-working.jpg";

interface Developer {
  name: string;
  idNumber: string;
  photoUrl: string;
  photoAlt: string;
  url: string;
}

const developers: Developer[] = [
  {
    name: "Abid Hossain",
    idNumber: "2405114",
    photoUrl: abidPhoto,
    photoAlt: "Abid Hossain",
    url: "https://github.com/abidghumay/"
  },
  {
    name: "Kazi Md Raiyan",
    idNumber: "2405103",
    photoUrl: raiyanPhoto,
    photoAlt: "Kazi Md Raiyan",
    url: "https://github.com/kazimdraiyan/",
  },
];

export function AboutUsPage() {
  return (
    <div className="min-h-screen bg-[#090a0c] text-[#f8f9fa] pt-6 sm:pt-8 pb-28 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[650px] h-[650px] rounded-full bg-radial from-slate-300/10 via-slate-500/5 to-transparent blur-3xl opacity-50" />
      <div className="pointer-events-none absolute top-1/3 right-0 w-[600px] h-[600px] rounded-full bg-radial from-white/8 via-slate-400/5 to-transparent blur-3xl opacity-40" />
      <div className="pointer-events-none absolute bottom-40 left-1/4 w-[550px] h-[550px] rounded-full bg-radial from-slate-400/8 to-transparent blur-3xl opacity-35" />

      {/* Subtle architectural grid pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Minimal Navigation Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5 mb-12 sm:mb-16">
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

        {/* SECTION 1: Editorial ABOUT US Header */}
        <section className="mb-16 sm:mb-20">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl mb-8 font-light tracking-tight text-[#f8f9fa] leading-[1.12]">
            About us{" "}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Right Narrative Paragraphs */}
            <div className="md:col-span-9 space-y-6 text-[#94a3b8] text-sm sm:text-base md:text-lg leading-relaxed font-normal">
              <p>
                Built by two software engineers who believe finding a home
                shouldn't feel like solving a mystery. Nibash brings together
                smart technology, beautiful design, and verified listings to
                make renting simpler, safer, and a little more enjoyable.
                Tenants find spaces they can trust, while owners get transparent
                tools to manage their properties with confidence.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: Team Working Photo */}
        <section className="mb-20 sm:mb-28">
          <div className="p-1.5 sm:p-2.5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-sm max-w-4xl mx-auto">
            <div className="overflow-hidden rounded-xl sm:rounded-2xl relative bg-[#12151c]">
              <img
                src={teamWorkingPhoto}
                alt="Nibash Co-Founders Collaborating at Desk"
                className="w-full h-auto max-h-[560px] object-cover object-center hover:scale-[1.01] transition-transform duration-700 ease-out"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090a0c]/60 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </section>

        {/* SECTION 3: THE TEAM. */}
        <section className="mb-20 border-y border-white/10 py-16">
          <div className="mb-12 sm:mb-16 ">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-12">
              {/* Team */}
              <div className="lg:w-[50%]">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl mb-8 font-light tracking-tight text-[#f8f9fa] leading-[1.12]">
                  The Team
                </h1>
                <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed">
                  Two software engineers. One shared mission: making renting
                  less complicated. We're a small team that enjoys turning
                  complex problems into simple, reliable experiences. From
                  thoughtful interfaces to carefully engineered systems, we
                  believe great products come from equal parts curiosity,
                  precision, and a willingness to build things better.
                </p>
              </div>

              {/* Quote */}
              <div className="flex flex-col justify-center lg:w-[40%]">
                <span className="text-5xl sm:text-6xl text-white/40 font-serif leading-none select-none block mb-1">
                  "
                </span>
                <blockquote className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif italic text-white/95 leading-tight tracking-normal mb-14 sm:mb-20">
                  Just prompt{" "}
                  <span className="relative inline-block">
                    it.
                    <span className="absolute -bottom-14 sm:-bottom-18 right-0 text-5xl sm:text-6xl text-white/40 font-serif leading-none select-none pointer-events-none">
                      "
                    </span>
                  </span>
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-[1px] bg-white/30" />
                  <cite className="not-italic text-xs sm:text-sm font-mono uppercase tracking-wider text-[#94a3b8]">
                    Abid Hossain and Kazi Md Raiyan (Co-Founders)
                  </cite>
                </div>
              </div>
            </div>
          </div>

          {/* Developer Cards (Slightly Reduced Size & Clean Spacing) */}
          <div className="grid grid-cols-2 gap-8 lg:gap-12 max-w-3xl mx-auto">
            {developers.map((dev) => (
              <div
                key={dev.idNumber}
                className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/10 hover:border-white/30 transition-all duration-500 hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85)] flex flex-col group"
              >
                {/* 1. Developer Photograph (Top Section) */}
                <div className="w-full aspect-[4/4.2] max-h-[280px] overflow-hidden rounded-xl sm:rounded-2xl border border-white/15 bg-[#12151c] relative shadow-inner">
                  <a href={dev.url} target="_blank">
                    <img
                      src={dev.photoUrl}
                      alt={dev.photoAlt}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out"
                      loading="lazy"
                    />
                  </a>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090a0c]/60 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* 2. Below Section: Developer Name, Roll Number & GitHub */}
                <div className="mt-4 flex items-center justify-between px-1 pb-1">
                  <div className="flex flex-col">
                    <h3 className="text-xl sm:text-2xl font-serif text-white tracking-wide">
                      {dev.name}
                    </h3>
                    <div className="mt-1 text-sm font-mono tracking-wider text-[#cbd5e1]">
                      {dev.idNumber}
                    </div>
                  </div>
                  <a
                    href={dev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${dev.name} on GitHub`}
                    className="flex items-center justify-center w-10 h-10 rounded-full text-[#94a3b8] border border-white/15 hover:border-white/40 hover:text-white hover:bg-white/8 transition-all duration-200 shrink-0"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="w-5 h-5 fill-current"
                    >
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Back Button */}
        <div className="pt-12 text-center">
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
      </div>
    </div>
  );
}
