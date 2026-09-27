import { useEffect, useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface PlatformOverview {
  total_users: number;
  total_owners: number;
  total_tenants: number;
  listings_approved: number;
  listings_waiting: number;
  listings_rejected: number;
  listings_occupied: number;
  active_contracts: number;
}

interface GrowthTrendItem {
  week: string;
  count: number;
}

interface GrowthTrends {
  signups_per_week: GrowthTrendItem[];
  listings_per_week: GrowthTrendItem[];
  contracts_per_week: GrowthTrendItem[];
  applications_per_week: GrowthTrendItem[];
}

interface OwnerListingCount {
  owner_id: number;
  name: string;
  email: string;
  phone: string;
  listing_count: number;
}

interface ConcurrentTenant {
  tenant_id: number;
  name: string;
  email: string;
  phone: string;
  active_contract_count: number;
  listing_ids: number[];
}

interface RentOutlier {
  listing_id: number;
  title: string;
  owner_name: string;
  area_name: string;
  rent: number;
  typical_area_rent: number;
  difference_pct: number;
}

interface ListingNoPhotos {
  listing_id: number;
  title: string;
  status: string;
  owner_name: string;
  owner_email: string;
  area_name: string;
}

interface DuplicateLocation {
  listing_1_id: number;
  listing_1_title: string;
  owner_1_name: string;
  listing_2_id: number;
  listing_2_title: string;
  owner_2_name: string;
  area_name: string;
  lat_diff: number;
  lng_diff: number;
}

interface DashboardData {
  overview: PlatformOverview;
  growth: GrowthTrends;
  fraud: {
    owners_by_listing_count: OwnerListingCount[];
    concurrent_tenants: ConcurrentTenant[];
    rent_outliers: RentOutlier[];
    listings_no_photos: ListingNoPhotos[];
    duplicate_locations: DuplicateLocation[];
  };
}

export function VerifierDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accordion toggle states (default open for high-priority items)
  const [openSection, setOpenSection] = useState<{ [key: string]: boolean }>({
    outliers: true,
    concurrent: true,
    duplicates: true,
    owners: false,
    noPhotos: false,
  });

  const toggleSection = (key: string) => {
    setOpenSection((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get<DashboardData>("/dashboard")
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load dashboard data");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Access guard: non-verifiers are redirected to /listings
  if (user && !user.is_verifier) {
    return <Navigate to="/listings" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-full border-2 border-[#d4b068] border-t-transparent animate-spin mb-4" />
        <span className="text-xs uppercase tracking-[0.25em] text-[#cbd5e1] font-label-sm">
          Loading Verifier Intelligence...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
          <span className="material-symbols-outlined text-3xl">error</span>
        </div>
        <h2 className="text-2xl font-serif font-bold text-white mb-2">Dashboard Error</h2>
        <p className="text-slate-400 mb-6">{error || "Unable to fetch dashboard intelligence."}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs uppercase tracking-widest font-label-sm transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  const { overview, growth, fraud } = data;

  // Prepare merged weekly data for the growth chart (Signups, Listings, Contracts, Applications)
  const weekMap = new Map<string, { signups: number; listings: number; contracts: number; applications: number }>();

  growth.signups_per_week.forEach((item) => {
    weekMap.set(item.week, { signups: item.count, listings: 0, contracts: 0, applications: 0 });
  });
  growth.listings_per_week.forEach((item) => {
    const existing = weekMap.get(item.week) || { signups: 0, listings: 0, contracts: 0, applications: 0 };
    existing.listings = item.count;
    weekMap.set(item.week, existing);
  });
  (growth.contracts_per_week || []).forEach((item) => {
    const existing = weekMap.get(item.week) || { signups: 0, listings: 0, contracts: 0, applications: 0 };
    existing.contracts = item.count;
    weekMap.set(item.week, existing);
  });
  (growth.applications_per_week || []).forEach((item) => {
    const existing = weekMap.get(item.week) || { signups: 0, listings: 0, contracts: 0, applications: 0 };
    existing.applications = item.count;
    weekMap.set(item.week, existing);
  });

  const sortedWeeks = Array.from(weekMap.keys()).sort();
  const chartPoints = sortedWeeks.map((week) => ({
    week,
    signups: weekMap.get(week)?.signups || 0,
    listings: weekMap.get(week)?.listings || 0,
    contracts: weekMap.get(week)?.contracts || 0,
    applications: weekMap.get(week)?.applications || 0,
  }));

  const maxVal = Math.max(
    ...chartPoints.map((p) => Math.max(p.signups, p.listings, p.contracts, p.applications)),
    5
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Top Header — Landing Page Luxury Aesthetic */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-panel-subtle border border-white/10 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4b068]" />
            <span className="font-label-sm text-[11px] uppercase tracking-[0.2em] text-[#cbd5e1]">
              Trust & Safety Operations
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#f8f9fa] tracking-tight">
            Verifier Intelligence <span className="font-serif italic font-normal text-silver-gradient-text">Dashboard</span>
          </h1>
          <p className="text-sm sm:text-base text-[#94a3b8] mt-2 max-w-2xl leading-relaxed">
            Real-time platform metrics, growth velocity, and integrity signals to assist verifiers in maintaining listing quality and authenticity.
          </p>
        </div>

        {/* Quick Review Queue Navigation Button */}
        <button
          onClick={() => navigate("/listings?view=pending")}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#d4b068] hover:bg-[#c29d55] text-[#090a0c] font-semibold text-xs uppercase tracking-widest font-label-sm shadow-lg hover:shadow-[#d4b068]/20 transition-all cursor-pointer group"
        >
          <span>Review New Listings ({overview.listings_waiting})</span>
          <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PLATFORM OVERVIEW                                                         */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-base text-blue-400">monitoring</span>
            <h2 className="text-xs uppercase tracking-widest font-label-sm text-slate-300 font-semibold">
              Platform Overview
            </h2>
          </div>
        </div>

        {/* Primary 5 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-[#111214] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs uppercase tracking-wider font-label-sm">Total Users</span>
              <span className="material-symbols-outlined text-blue-400 text-xl">group</span>
            </div>
            <div className="text-3xl font-serif font-light text-white">{overview.total_users}</div>
            <p className="text-[11px] text-slate-500 mt-1">Platform registered</p>
          </div>

          <div className="bg-[#111214] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs uppercase tracking-wider font-label-sm">Owners</span>
              <span className="material-symbols-outlined text-amber-400 text-xl">real_estate_agent</span>
            </div>
            <div className="text-3xl font-serif font-light text-white">{overview.total_owners}</div>
            <p className="text-[11px] text-slate-500 mt-1">Landlord profiles</p>
          </div>

          <div className="bg-[#111214] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs uppercase tracking-wider font-label-sm">Tenants</span>
              <span className="material-symbols-outlined text-emerald-400 text-xl">person</span>
            </div>
            <div className="text-3xl font-serif font-light text-white">{overview.total_tenants}</div>
            <p className="text-[11px] text-slate-500 mt-1">Tenant profiles</p>
          </div>

          <div className="bg-[#111214] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs uppercase tracking-wider font-label-sm">Approved</span>
              <span className="material-symbols-outlined text-green-400 text-xl">domain_verification</span>
            </div>
            <div className="text-3xl font-serif font-light text-white">{overview.listings_approved}</div>
            <p className="text-[11px] text-slate-500 mt-1">Active on catalog</p>
          </div>

          <div className="bg-[#111214] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs uppercase tracking-wider font-label-sm">Active Contracts</span>
              <span className="material-symbols-outlined text-purple-400 text-xl">handshake</span>
            </div>
            <div className="text-3xl font-serif font-light text-white">{overview.active_contracts}</div>
            <p className="text-[11px] text-slate-500 mt-1">Signed leases</p>
          </div>
        </div>

        {/* Secondary Listing Status Breakdown Chips — Pending Review is Clickable */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/listings?view=pending"
            className="bg-[#111214]/80 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-400/50 rounded-xl px-4 py-3 flex items-center justify-between transition-all group cursor-pointer shadow-sm hover:shadow-amber-500/10"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-base group-hover:scale-110 transition-transform">
                hourglass_top
              </span>
              <span className="text-xs text-slate-300 group-hover:text-white transition-colors">
                Pending Review
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-amber-400 font-mono">
                {overview.listings_waiting}
              </span>
              <span className="material-symbols-outlined text-xs text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all">
                arrow_forward
              </span>
            </div>
          </Link>

          <div className="bg-[#111214]/60 border border-blue-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400 text-base">home_work</span>
              <span className="text-xs text-slate-300">Occupied Units</span>
            </div>
            <span className="text-sm font-bold text-blue-400 font-mono">{overview.listings_occupied}</span>
          </div>

          <div className="bg-[#111214]/60 border border-red-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-400 text-base">cancel</span>
              <span className="text-xs text-slate-300">Rejected Listings</span>
            </div>
            <span className="text-sm font-bold text-red-400 font-mono">{overview.listings_rejected}</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PLATFORM GROWTH TRENDS (EXPANDED DUAL/TRIPLE SERIES)                      */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-base text-emerald-400">trending_up</span>
              <h2 className="text-xs uppercase tracking-widest font-label-sm text-slate-300 font-semibold">
                Platform Growth Trends
              </h2>
            </div>
            <p className="text-xs text-[#94a3b8] mt-1">
              Weekly user registrations, property listings, and signed contracts over the last 8 weeks.
            </p>
          </div>

          {/* Chart Legend — 4 Data Series */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] inline-block shadow-sm shadow-blue-500/50" />
              <span className="text-slate-300 font-label-sm">User Signups</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] inline-block shadow-sm shadow-amber-400/50" />
              <span className="text-slate-300 font-label-sm">New Listings</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] inline-block shadow-sm shadow-emerald-400/50" />
              <span className="text-slate-300 font-label-sm">Signed Leases</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#a78bfa] inline-block shadow-sm shadow-violet-400/50" />
              <span className="text-slate-300 font-label-sm">Applications</span>
            </div>
          </div>
        </div>

        {/* SVG Chart Container — Fixed Vertical Squeeze with h-80/h-96 */}
        <div className="bg-[#111214] border border-white/10 rounded-2xl p-6 sm:p-8">
          {chartPoints.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
              No historical data available in the last 8 weeks.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="min-w-[650px]">
                <svg
                  viewBox="0 0 800 360"
                  className="w-full h-80 sm:h-96 overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines across 5 increments */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                    const y = 290 - pct * 230;
                    const val = Math.round(pct * maxVal);
                    return (
                      <g key={i}>
                        <line
                          x1="50"
                          y1={y}
                          x2="780"
                          y2={y}
                          stroke="#ffffff"
                          strokeOpacity="0.07"
                          strokeDasharray="4 4"
                        />
                        <text
                          x="40"
                          y={y + 4}
                          textAnchor="end"
                          fill="#64748b"
                          fontSize="11"
                          fontFamily="monospace"
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Dynamic Curve Rendering */}
                  {(() => {
                    const count = chartPoints.length;
                    const stepX = count > 1 ? (780 - 70) / (count - 1) : 0;

                    const signupCoords = chartPoints.map((pt, idx) => ({
                      x: 70 + idx * stepX,
                      y: 290 - (pt.signups / maxVal) * 230,
                      val: pt.signups,
                      week: pt.week,
                    }));

                    const listingCoords = chartPoints.map((pt, idx) => ({
                      x: 70 + idx * stepX,
                      y: 290 - (pt.listings / maxVal) * 230,
                      val: pt.listings,
                      week: pt.week,
                    }));

                    const contractCoords = chartPoints.map((pt, idx) => ({
                      x: 70 + idx * stepX,
                      y: 290 - (pt.contracts / maxVal) * 230,
                      val: pt.contracts,
                      week: pt.week,
                    }));

                    const applicationCoords = chartPoints.map((pt, idx) => ({
                      x: 70 + idx * stepX,
                      y: 290 - (pt.applications / maxVal) * 230,
                      val: pt.applications,
                      week: pt.week,
                    }));

                    const signupPath = signupCoords
                      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
                      .join(" ");

                    const listingPath = listingCoords
                      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
                      .join(" ");

                    const contractPath = contractCoords
                      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
                      .join(" ");

                    const applicationPath = applicationCoords
                      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
                      .join(" ");

                    const lastX = signupCoords[signupCoords.length - 1].x;
                    const firstX = signupCoords[0].x;

                    const signupArea = `${signupPath} L ${lastX} 290 L ${firstX} 290 Z`;
                    const listingArea = `${listingPath} L ${lastX} 290 L ${firstX} 290 Z`;
                    const contractArea = `${contractPath} L ${lastX} 290 L ${firstX} 290 Z`;
                    const applicationArea = `${applicationPath} L ${lastX} 290 L ${firstX} 290 Z`;

                    return (
                      <>
                        {/* Area fills */}
                        <path d={signupArea} fill="url(#blueGradient)" />
                        <path d={listingArea} fill="url(#amberGradient)" />
                        <path d={contractArea} fill="url(#emeraldGradient)" />
                        <path d={applicationArea} fill="url(#violetGradient)" />

                        {/* Trend lines */}
                        <path
                          d={signupPath}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d={listingPath}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d={contractPath}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d={applicationPath}
                          fill="none"
                          stroke="#a78bfa"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Signups Markers */}
                        {signupCoords.map((c, i) => (
                          <g key={`s-${i}`} className="cursor-pointer group">
                            <circle
                              cx={c.x}
                              cy={c.y}
                              r="4.5"
                              fill="#090a0c"
                              stroke="#3b82f6"
                              strokeWidth="2.5"
                            />
                            <text
                              x={c.x}
                              y={c.y - 10}
                              textAnchor="middle"
                              fill="#93c5fd"
                              fontSize="10"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {c.val}
                            </text>
                          </g>
                        ))}

                        {/* Listings Markers */}
                        {listingCoords.map((c, i) => (
                          <g key={`l-${i}`} className="cursor-pointer group">
                            <circle
                              cx={c.x}
                              cy={c.y}
                              r="4.5"
                              fill="#090a0c"
                              stroke="#f59e0b"
                              strokeWidth="2.5"
                            />
                            <text
                              x={c.x}
                              y={c.y + 16}
                              textAnchor="middle"
                              fill="#fde68a"
                              fontSize="10"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {c.val}
                            </text>
                          </g>
                        ))}

                        {/* Contracts Markers */}
                        {contractCoords.map((c, i) => (
                          <g key={`c-${i}`} className="cursor-pointer group">
                            <circle
                              cx={c.x}
                              cy={c.y}
                              r="4.5"
                              fill="#090a0c"
                              stroke="#10b981"
                              strokeWidth="2.5"
                            />
                            <text
                              x={c.x}
                              y={c.y - 10}
                              textAnchor="middle"
                              fill="#a7f3d0"
                              fontSize="10"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {c.val}
                            </text>
                          </g>
                        ))}

                        {/* Applications Markers */}
                        {applicationCoords.map((c, i) => (
                          <g key={`a-${i}`} className="cursor-pointer group">
                            <circle
                              cx={c.x}
                              cy={c.y}
                              r="4.5"
                              fill="#090a0c"
                              stroke="#a78bfa"
                              strokeWidth="2.5"
                            />
                            <text
                              x={c.x}
                              y={c.y + 16}
                              textAnchor="middle"
                              fill="#ddd6fe"
                              fontSize="10"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {c.val}
                            </text>
                          </g>
                        ))}

                        {/* X-axis week labels */}
                        {signupCoords.map((c, i) => {
                          const dateObj = new Date(c.week);
                          const formattedDate = dateObj.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          });
                          return (
                            <text
                              key={`t-${i}`}
                              x={c.x}
                              y="325"
                              textAnchor="middle"
                              fill="#94a3b8"
                              fontSize="11"
                              fontFamily="sans-serif"
                            >
                              {formattedDate}
                            </text>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* INTEGRITY & RISK SIGNALS (CLEAN NON-TECHNICAL PRESENTATION)               */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-red-400 text-lg">crisis_alert</span>
            <h2 className="text-xs uppercase tracking-widest font-label-sm text-red-400 font-semibold">
              Integrity & Risk Signals
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Automated platform heuristics highlighting duplicate listings, concurrent leases, pricing anomalies, and missing media.
          </p>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* RENT OUTLIERS BY NEIGHBORHOOD (CLEAN NON-OUTLIER AVERAGE)               */}
        {/* ----------------------------------------------------------------------- */}
        <div className="bg-[#111214] border border-white/10 rounded-2xl overflow-hidden transition-all">
          <button
            onClick={() => toggleSection("outliers")}
            className="w-full px-6 py-4 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-amber-400 text-xl">query_stats</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-base text-white">
                    Rent Outliers by Neighborhood
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                    fraud.rent_outliers.length > 0
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  }`}>
                    {fraud.rent_outliers.length} Flagged
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Listings with rental prices significantly differing from neighborhood market rates
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-400">
              {openSection.outliers ? "expand_less" : "expand_more"}
            </span>
          </button>

          {openSection.outliers && (
            <div className="p-6 border-t border-white/10">
              {fraud.rent_outliers.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
                  <span>No rent outliers detected across neighborhoods. All listings fall within typical local market rates.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 font-label-sm uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Property</th>
                        <th className="pb-3 font-semibold">Neighborhood</th>
                        <th className="pb-3 font-semibold">Landlord</th>
                        <th className="pb-3 font-semibold text-right">Listed Rent</th>
                        <th className="pb-3 font-semibold text-right">Typical Market Rent</th>
                        <th className="pb-3 font-semibold text-right">Deviation</th>
                        <th className="pb-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {fraud.rent_outliers.map((row) => (
                        <tr key={row.listing_id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 pr-4">
                            <Link
                              to={`/listings/${row.listing_id}`}
                              className="font-medium text-white hover:text-amber-400 flex items-center gap-1 transition-colors"
                            >
                              <span>{row.title}</span>
                              <span className="material-symbols-outlined text-xs text-slate-500">open_in_new</span>
                            </Link>
                            <span className="text-[10px] text-slate-500 font-mono">ID: #{row.listing_id}</span>
                          </td>
                          <td className="py-3 px-2 text-slate-300">{row.area_name}</td>
                          <td className="py-3 px-2 text-slate-300">{row.owner_name}</td>
                          <td className="py-3 px-2 text-right font-bold text-amber-300 font-mono">
                            ৳{row.rent.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-right text-slate-300 font-mono">
                            ৳{row.typical_area_rent.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              row.difference_pct >= 100 || row.difference_pct <= -60
                                ? "bg-red-500/20 text-red-300 border border-red-500/40"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            }`}>
                              {row.difference_pct > 0 ? `+${row.difference_pct}%` : `${row.difference_pct}%`}
                            </span>
                          </td>
                          <td className="py-3 pl-4 text-right">
                            <Link
                              to={`/listings/${row.listing_id}`}
                              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-medium border border-white/10 transition-colors inline-block"
                            >
                              Inspect
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* DUPLICATE LOCATION DETECTION                                            */}
        {/* ----------------------------------------------------------------------- */}
        <div className="bg-[#111214] border border-white/10 rounded-2xl overflow-hidden transition-all">
          <button
            onClick={() => toggleSection("duplicates")}
            className="w-full px-6 py-4 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-orange-400 text-xl">share_location</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-base text-white">
                    Duplicate Location Detection
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                    fraud.duplicate_locations.length > 0
                      ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  }`}>
                    {fraud.duplicate_locations.length} Suspect Pairs
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Properties registered at identical or overlapping geographic coordinates
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-400">
              {openSection.duplicates ? "expand_less" : "expand_more"}
            </span>
          </button>

          {openSection.duplicates && (
            <div className="p-6 border-t border-white/10">
              {fraud.duplicate_locations.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
                  <span>No suspicious geographic duplicates detected across different owners.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 font-label-sm uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Listing A (Landlord A)</th>
                        <th className="pb-3 font-semibold">Listing B (Landlord B)</th>
                        <th className="pb-3 font-semibold">Area</th>
                        <th className="pb-3 font-semibold text-right">Est. Distance</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {fraud.duplicate_locations.map((row) => {
                        const estMeters = Math.round((row.lat_diff + row.lng_diff) * 111000);
                        return (
                          <tr key={`${row.listing_1_id}-${row.listing_2_id}`} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 pr-4">
                              <Link
                                to={`/listings/${row.listing_1_id}`}
                                className="font-medium text-white hover:text-amber-400 flex items-center gap-1 transition-colors"
                              >
                                <span>{row.listing_1_title}</span>
                                <span className="material-symbols-outlined text-xs text-slate-500">open_in_new</span>
                              </Link>
                              <div className="text-[11px] text-slate-400">
                                Owner: <span className="text-slate-300">{row.owner_1_name}</span>{" "}
                                <span className="text-slate-600 font-mono">(#{row.listing_1_id})</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <Link
                                to={`/listings/${row.listing_2_id}`}
                                className="font-medium text-white hover:text-amber-400 flex items-center gap-1 transition-colors"
                              >
                                <span>{row.listing_2_title}</span>
                                <span className="material-symbols-outlined text-xs text-slate-500">open_in_new</span>
                              </Link>
                              <div className="text-[11px] text-slate-400">
                                Owner: <span className="text-slate-300">{row.owner_2_name}</span>{" "}
                                <span className="text-slate-600 font-mono">(#{row.listing_2_id})</span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-slate-300">{row.area_name}</td>
                            <td className="py-3 px-2 text-right">
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
                                ~{estMeters} meters
                              </span>
                            </td>
                            <td className="py-3 pl-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Link
                                  to={`/listings/${row.listing_1_id}`}
                                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white text-[11px] border border-white/10"
                                >
                                  View A
                                </Link>
                                <Link
                                  to={`/listings/${row.listing_2_id}`}
                                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white text-[11px] border border-white/10"
                                >
                                  View B
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* CONCURRENT ACTIVE LEASES                                                */}
        {/* ----------------------------------------------------------------------- */}
        <div className="bg-[#111214] border border-white/10 rounded-2xl overflow-hidden transition-all">
          <button
            onClick={() => toggleSection("concurrent")}
            className="w-full px-6 py-4 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-red-400 text-xl">person_alert</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-base text-white">
                    Tenants with Concurrent Active Leases
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                    fraud.concurrent_tenants.length > 0
                      ? "bg-red-500/20 text-red-300 border border-red-500/40"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  }`}>
                    {fraud.concurrent_tenants.length} Double-Occupancy Violations
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tenants holding active lease agreements on multiple properties simultaneously
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-400">
              {openSection.concurrent ? "expand_less" : "expand_more"}
            </span>
          </button>

          {openSection.concurrent && (
            <div className="p-6 border-t border-white/10">
              {fraud.concurrent_tenants.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
                  <span>No concurrent tenant leases detected. All active lease agreements maintain 1:1 occupancy integrity.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 font-label-sm uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Tenant Name</th>
                        <th className="pb-3 font-semibold">Contact Email</th>
                        <th className="pb-3 font-semibold">Phone</th>
                        <th className="pb-3 font-semibold text-center">Active Contracts</th>
                        <th className="pb-3 font-semibold">Linked Listing IDs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {fraud.concurrent_tenants.map((row) => (
                        <tr key={row.tenant_id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 pr-4 font-semibold text-white">{row.name}</td>
                          <td className="py-3 px-2 text-slate-400">{row.email}</td>
                          <td className="py-3 px-2 text-slate-400 font-mono">{row.phone}</td>
                          <td className="py-3 px-2 text-center">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                              {row.active_contract_count} Signed Leases
                            </span>
                          </td>
                          <td className="py-3 pl-4">
                            <div className="flex flex-wrap gap-1.5">
                              {row.listing_ids.map((id) => (
                                <Link
                                  key={id}
                                  to={`/listings/${id}`}
                                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-amber-300 border border-white/10 font-mono text-[11px]"
                                >
                                  #{id}
                                </Link>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* OWNERS RANKED BY LISTING COUNT                                          */}
        {/* ----------------------------------------------------------------------- */}
        <div className="bg-[#111214] border border-white/10 rounded-2xl overflow-hidden transition-all">
          <button
            onClick={() => toggleSection("owners")}
            className="w-full px-6 py-4 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-blue-400 text-xl">leaderboard</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-base text-white">
                    Owners Ranked by Listing Count
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 font-mono font-semibold">
                    {fraud.owners_by_listing_count.length} Registered Landlords
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Landlords ordered by number of registered properties
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-400">
              {openSection.owners ? "expand_less" : "expand_more"}
            </span>
          </button>

          {openSection.owners && (
            <div className="p-6 border-t border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-label-sm uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Rank</th>
                      <th className="pb-3 font-semibold">Owner Name</th>
                      <th className="pb-3 font-semibold">Email</th>
                      <th className="pb-3 font-semibold">Phone</th>
                      <th className="pb-3 font-semibold text-right">Listing Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {fraud.owners_by_listing_count.map((row, index) => (
                      <tr key={row.owner_id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-4 font-mono text-slate-500">#{index + 1}</td>
                        <td className="py-3 px-2 font-semibold text-white">{row.name}</td>
                        <td className="py-3 px-2 text-slate-400">{row.email}</td>
                        <td className="py-3 px-2 text-slate-400 font-mono">{row.phone}</td>
                        <td className="py-3 pl-4 text-right">
                          <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded ${
                            row.listing_count >= 10
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "text-white"
                          }`}>
                            {row.listing_count} properties
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* LISTINGS WITH ZERO PHOTOS                                               */}
        {/* ----------------------------------------------------------------------- */}
        <div className="bg-[#111214] border border-white/10 rounded-2xl overflow-hidden transition-all">
          <button
            onClick={() => toggleSection("noPhotos")}
            className="w-full px-6 py-4 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-400 text-xl">no_photography</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-base text-white">
                    Listings with Zero Photos
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                    fraud.listings_no_photos.length > 0
                      ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  }`}>
                    {fraud.listings_no_photos.length} Photo-less
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Listings submitted without any property photographs
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-400">
              {openSection.noPhotos ? "expand_less" : "expand_more"}
            </span>
          </button>

          {openSection.noPhotos && (
            <div className="p-6 border-t border-white/10">
              {fraud.listings_no_photos.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
                  <span>Every active listing has at least one verified property photograph attached.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 font-label-sm uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Listing</th>
                        <th className="pb-3 font-semibold">Area</th>
                        <th className="pb-3 font-semibold">Owner</th>
                        <th className="pb-3 font-semibold">Contact Email</th>
                        <th className="pb-3 font-semibold text-center">Status</th>
                        <th className="pb-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {fraud.listings_no_photos.map((row) => (
                        <tr key={row.listing_id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 pr-4">
                            <Link
                              to={`/listings/${row.listing_id}`}
                              className="font-medium text-white hover:text-amber-400 flex items-center gap-1 transition-colors"
                            >
                              <span>{row.title}</span>
                              <span className="material-symbols-outlined text-xs text-slate-500">open_in_new</span>
                            </Link>
                            <span className="text-[10px] text-slate-500 font-mono">ID: #{row.listing_id}</span>
                          </td>
                          <td className="py-3 px-2 text-slate-300">{row.area_name}</td>
                          <td className="py-3 px-2 text-slate-300">{row.owner_name}</td>
                          <td className="py-3 px-2 text-slate-400">{row.owner_email}</td>
                          <td className="py-3 px-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                              row.status === "waiting"
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="py-3 pl-4 text-right">
                            <Link
                              to={`/listings/${row.listing_id}`}
                              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-medium border border-white/10 transition-colors inline-block"
                            >
                              Inspect
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* ACTION CALLOUT                                                            */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-r from-[#d4b068]/15 via-[#111214] to-[#111214] border border-[#d4b068]/30 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-[#d4b068]">
            <span className="material-symbols-outlined text-xl">verified</span>
            <span className="text-xs uppercase tracking-widest font-label-sm font-semibold">
              Ready for Verification
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-serif font-light text-white">
            {overview.listings_waiting} Listing{overview.listings_waiting === 1 ? "" : "s"} Awaiting Verification
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Review landlord identity credentials, ownership deed documentation, and approve properties directly into the public Nibash catalog.
          </p>
        </div>

        <button
          onClick={() => navigate("/listings?view=pending")}
          className="px-8 py-3.5 rounded-xl bg-[#d4b068] hover:bg-[#c29d55] text-[#090a0c] font-semibold text-xs uppercase tracking-widest font-label-sm shadow-xl hover:shadow-[#d4b068]/30 transition-all cursor-pointer flex items-center gap-2 group whitespace-nowrap"
        >
          <span>Review New Listings</span>
          <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </button>
      </section>
    </div>
  );
}
