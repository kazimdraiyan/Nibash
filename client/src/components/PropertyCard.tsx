import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Listing } from "../types/listing";
import type { BackendListing } from "../pages/ListingsPage";
import { getAreaName } from "../utils/areaLookup";
import { useAuth } from "../context/AuthContext";
import { hasUserApplied } from "../utils/applicationStorage";

export type PropertyCardItem = Listing | BackendListing;

interface PropertyCardProps {
  listing: PropertyCardItem;
  isOwn?: boolean;
  isApplied?: boolean;
  onSelect?: (listing: PropertyCardItem) => void;
  onOpenAppInfo?: (item: BackendListing) => void;
}

export function PropertyCard({
  listing,
  isOwn: isOwnProp = false,
  isApplied: isAppliedProp = false,
  onSelect,
  onOpenAppInfo,
}: PropertyCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Normalize ID
  const id = String(listing.id);

  // Determine if current user owns listing
  const isOwner = Boolean(
    isOwnProp ||
      (user &&
        "owner_id" in listing &&
        listing.owner_id !== undefined &&
        listing.owner_id !== null &&
        Number(listing.owner_id) === Number(user.id))
  );

  // Determine if current user has already applied (only applies to non-owners)
  const isUserApplied = Boolean(
    !isOwner &&
      (isAppliedProp || (user && hasUserApplied(user.id, listing.id)))
  );

  // Format listing status for owner
  const rawStatus =
    "status" in listing && typeof listing.status === "string" && listing.status.trim()
      ? listing.status.trim()
      : "Approved";
  const statusDisplay = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
  const isApproved = statusDisplay.toLowerCase() === "approved";
  const isWaiting =
    statusDisplay.toLowerCase() === "waiting" || statusDisplay.toLowerCase() === "pending";

  // Normalize Location using area code lookup or existing string
  const location =
    "area_id" in listing && listing.area_id
      ? getAreaName(listing.area_id)
      : "location" in listing && listing.location
      ? listing.location
      : "Dhaka";

  // Normalize Title
  const title =
    listing.title ||
    ("location" in listing && listing.location
      ? `Apartment in ${listing.location}`
      : `Apartment #${id}`);

  // Normalize Price / Rent
  const rawPrice =
    "rent" in listing && listing.rent !== undefined && listing.rent !== null && listing.rent !== ""
      ? Number(listing.rent)
      : "price" in listing && listing.price !== undefined && listing.price !== null
      ? Number(listing.price)
      : null;

  const priceFormatted =
    rawPrice !== null && !isNaN(rawPrice)
      ? `৳${rawPrice.toLocaleString()}`
      : null;

  // Normalize Beds / Baths / Floor
  const beds =
    "bedroom_count" in listing
      ? listing.bedroom_count
      : "beds" in listing
      ? listing.beds
      : 0;

  const baths =
    "bathroom_count" in listing
      ? listing.bathroom_count
      : "baths" in listing
      ? listing.baths
      : 0;

  const floor =
    "on_which_floor" in listing
      ? listing.on_which_floor
      : "floor" in listing
      ? listing.floor
      : null;

  const sqft = "sqft" in listing ? listing.sqft : null;

  // Normalize Image (Blank when missing; no placeholders or generic stock)
  const imageUrl =
    "imageUrl" in listing && typeof listing.imageUrl === "string" && listing.imageUrl.trim() !== ""
      ? listing.imageUrl.trim()
      : null;

  const hasValidImage = Boolean(imageUrl && !imgError);

  const handleClick = () => {
    if (onSelect) {
      onSelect(listing);
    } else if (isUserApplied && onOpenAppInfo && "status" in listing) {
      onOpenAppInfo(listing as BackendListing);
    } else if (isUserApplied) {
      navigate(`/listings/${id}#apply-section`);
    } else {
      navigate(`/listings/${id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group relative rounded-2xl overflow-hidden glass-panel border border-white/10 hover:border-white/30 transition-all duration-500 hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85)] flex flex-col cursor-pointer bg-[#12151c]/90 text-left"
    >
      {/* Property Image Container (Preserves layout; empty/blank when no image exists) */}
      <div className="relative h-72 w-full overflow-hidden bg-[#0d1017] border-b border-white/5">
        {hasValidImage && (
          <img
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            src={imageUrl!}
            alt={listing.title || "Luxury apartment"}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}

        {/* Charcoal & Silver subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a0c] via-transparent to-black/35 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <span className="glass-panel-subtle px-3 py-1 rounded-full text-[11px] font-label-sm uppercase tracking-wider text-[#d4b068] border border-[#d4b068]/40 shadow-md">
                  Your Listing
                </span>
                <span
                  className={`glass-panel-subtle px-3 py-1 rounded-full text-[11px] font-label-sm uppercase tracking-wider shadow-md flex items-center gap-1.5 border ${
                    isApproved
                      ? "text-emerald-300 border-emerald-500/40 bg-emerald-950/50"
                      : isWaiting
                      ? "text-amber-300 border-amber-500/40 bg-amber-950/50"
                      : "text-slate-300 border-slate-700 bg-slate-800/60"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isApproved
                        ? "bg-emerald-400"
                        : isWaiting
                        ? "bg-amber-400 animate-pulse"
                        : "bg-slate-400"
                    }`}
                  />
                  Status: {statusDisplay}
                </span>
              </>
            )}
            {isUserApplied && (
              <span className="glass-panel-subtle px-3 py-1 rounded-full text-[11px] font-label-sm uppercase tracking-wider text-emerald-300 border border-emerald-500/40 shadow-md flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">done_all</span>
                Applied
              </span>
            )}
            {"verified" in listing && listing.verified && (
              <span className="glass-panel-subtle px-3 py-1 rounded-full text-[11px] font-label-sm uppercase tracking-wider text-white border border-white/15 flex items-center gap-1.5 shadow-md">
                <span className="material-symbols-outlined text-[14px] text-[#cbd5e1]">
                  verified
                </span>
                Verified
              </span>
            )}
            {"propertyType" in listing && listing.propertyType && (
              <span className="glass-panel-subtle px-2.5 py-1 rounded-full text-[11px] font-label-sm uppercase tracking-wider text-[#cbd5e1] border border-white/15 shadow-md">
                {listing.propertyType}
              </span>
            )}
          </div>

          {/* Interactive Favorite Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsFavorite(!isFavorite);
            }}
            aria-label="Save listing"
            className={`w-9 h-9 rounded-full glass-panel-subtle border border-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer ${
              isFavorite
                ? "bg-white/20 text-[#d4b068] border-[#d4b068]/50 shadow-[0_0_15px_rgba(212,175,85,0.4)]"
                : "text-white/80 hover:text-white"
            }`}
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={{
                fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              favorite
            </span>
          </button>
        </div>

        {/* Floating Quick Price Tag */}
        {priceFormatted && (
          <div className="absolute bottom-3 left-3.5 z-10">
            <div className="text-[10px] text-[#94a3b8] font-label-sm uppercase tracking-wider mb-0.5">
              Monthly Rent
            </div>
            <div className="text-2xl font-serif text-white font-normal flex items-baseline gap-1">
              <span>{priceFormatted}</span>
              <span className="text-xs text-[#94a3b8] font-sans">/mo</span>
            </div>
          </div>
        )}
      </div>

      {/* Card Body Details */}
      <div className="p-5 flex flex-col justify-between flex-grow gap-4">
        <div>
          <h3 className="text-base font-medium text-white group-hover:text-[#e2e8f0] transition-colors line-clamp-1 mb-1">
            {title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
            <span className="material-symbols-outlined text-sm text-[#cbd5e1]">
              location_on
            </span>
            <span className="line-clamp-1">{location}</span>
          </div>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl glass-panel-subtle border border-white/5 text-center">
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-white">{beds}</span>
            <span className="text-[10px] uppercase font-label-sm text-[#94a3b8]">
              Bedrooms
            </span>
          </div>
          <div className="flex flex-col items-center border-x border-white/10">
            <span className="text-xs font-semibold text-white">{baths}</span>
            <span className="text-[10px] uppercase font-label-sm text-[#94a3b8]">
              Baths
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-white">
              {sqft ? `${sqft} sqft` : floor ? `Floor ${floor}` : "Standard"}
            </span>
            <span className="text-[10px] uppercase font-label-sm text-[#94a3b8]">
              {sqft ? "Sq Ft" : "Floor Level"}
            </span>
          </div>
        </div>

        {/* Bottom CTA Row */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <div className="flex items-center gap-1 text-xs text-[#d4b068]">
            <span>★</span>
            <span className="font-semibold text-white">
              {"rating" in listing && listing.rating ? listing.rating : "4.9"}
            </span>
            <span className="text-[#94a3b8] text-[11px] font-sans">
              (Verified)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isOwner ? (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  isApproved
                    ? "text-emerald-300 bg-emerald-950/80 border-emerald-500/40 shadow-sm"
                    : isWaiting
                    ? "text-amber-300 bg-amber-950/80 border-amber-500/40 shadow-sm"
                    : "text-slate-300 bg-slate-800 border-slate-700"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isApproved
                      ? "bg-emerald-400"
                      : isWaiting
                      ? "bg-amber-400 animate-pulse"
                      : "bg-slate-400"
                  }`}
                />
                <span>Status: {statusDisplay}</span>
              </span>
            ) : isUserApplied ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenAppInfo && "status" in listing) {
                    onOpenAppInfo(listing as BackendListing);
                  } else {
                    navigate(`/listings/${id}#apply-section`);
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-label-sm uppercase tracking-wider text-emerald-300 hover:text-emerald-200 group-hover:translate-x-0.5 transition-all cursor-pointer font-medium"
              >
                <span>View</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            ) : (
              <Link
                to={`/listings/${id}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs font-label-sm uppercase tracking-wider text-[#cbd5e1] group-hover:text-white group-hover:translate-x-0.5 transition-all"
              >
                <span>Explore</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
