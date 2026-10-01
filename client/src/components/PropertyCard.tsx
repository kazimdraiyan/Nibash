import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Listing } from "../types/listing";
import type { BackendListing } from "../pages/ListingsPage";
import { getAreaName } from "../utils/areaLookup";
import { useAuth } from "../context/AuthContext";
import { hasUserApplied } from "../utils/applicationStorage";
import { apiClient } from "../api/client";

export type PropertyCardItem = Listing | BackendListing;

interface PropertyCardProps {
  listing: PropertyCardItem;
  isOwn?: boolean;
  isApplied?: boolean;
  initialStarred?: boolean;
  onSelect?: (listing: PropertyCardItem) => void;
  onOpenAppInfo?: (item: BackendListing) => void;
}

export function PropertyCard({
  listing,
  isOwn: isOwnProp = false,
  isApplied: isAppliedProp = false,
  initialStarred = false,
  onSelect,
  onOpenAppInfo,
}: PropertyCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isStarred, setIsStarred] = useState(initialStarred);
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
  const isOccupied = statusDisplay.toLowerCase() === "occupied";

  const numericRating =
    "rating" in listing && listing.rating !== null && listing.rating !== undefined
      ? Number(listing.rating)
      : null;
  const reviewCount =
    "review_count" in listing && listing.review_count !== null && listing.review_count !== undefined
      ? Number(listing.review_count)
      : null;
  const hasRating = numericRating !== null && !isNaN(numericRating) && numericRating > 0;

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
      : "images" in listing && Array.isArray(listing.images) && listing.images.length > 0 && listing.images[0]?.url
      ? listing.images[0].url
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
            {/* {isOwner && (
              <>
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
            )} */}
            {/* {!isOwner && user?.is_verifier && isWaiting && (
              <span className="glass-panel-subtle px-3 py-1 rounded-full text-[11px] font-label-sm uppercase tracking-wider shadow-md flex items-center gap-1.5 border text-amber-300 border-amber-500/40 bg-amber-950/50">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Pending Verification
              </span>
            )} */}
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

          {/* Star Button - only for logged-in users */}
          {user && (
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                const next = !isStarred;
                setIsStarred(next); // optimistic
                try {
                  await apiClient.post(`/listings/${id}/togglestar`);
                } catch {
                  setIsStarred(!next); // revert on error
                }
              }}
              aria-label={isStarred ? "Unstar listing" : "Star listing"}
              className={`w-9 h-9 rounded-full glass-panel-subtle border border-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer ${
                isStarred
                  ? "bg-white/20 text-[#d4b068] border-[#d4b068]/50 shadow-[0_0_15px_rgba(212,175,85,0.4)]"
                  : "text-white/80 hover:text-white"
              }`}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{
                  fontVariationSettings: isStarred ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                grade
              </span>
            </button>
          )}

        </div>

        {/* Floating Quick Price Tag */}
        {priceFormatted && (
          <div className="absolute bottom-3 left-3.5 z-10">
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
            <span className="text-s font-semibold text-white">{beds}</span>
            <span className="text-[10px] uppercase font-label-sm text-[#94a3b8]">
              Bedrooms
            </span>
          </div>
          <div className="flex flex-col items-center border-x border-white/10">
            <span className="text-s font-semibold text-white">{baths}</span>
            <span className="text-[10px] uppercase font-label-sm text-[#94a3b8]">
              Baths
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-s font-semibold text-white">
              {floor}
            </span>
            <span className="text-[10px] uppercase font-label-sm text-[#94a3b8]">
              {sqft ? "Sq Ft" : "Floor"}
            </span>
          </div>
        </div>

        {/* Bottom CTA Row */}
        <div className="flex items-center justify-between pt-1">
          {hasRating ? (
            <div className="flex items-center gap-1 text-xs text-[#d4b068]">
              <span>★</span>
              <span className="font-semibold text-white">
                {numericRating.toFixed(1)}
              </span>
              <span className="text-[#94a3b8] text-[11px] font-sans">
                ({reviewCount ? `${reviewCount} review${reviewCount === 1 ? "" : "s"}` : "1 review"})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-[#94a3b8]">
              <span className="text-[#d4b068]/60">★</span>
              <span className="font-medium text-slate-300">
                New
              </span>
              <span className="text-[#94a3b8] text-[11px] font-sans">
                (No reviews)
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {isOwner ? (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  isApproved
                    ? "text-emerald-300 bg-emerald-950/80 border-emerald-500/40 shadow-sm"
                    : isWaiting
                    ? "text-amber-300 bg-amber-950/80 border-amber-500/40 shadow-sm"
                    : isOccupied
                    ? "text-rose-300 bg-rose-950/80 border-rose-500/40 shadow-sm"
                    : "text-slate-300 bg-slate-800 border-slate-700"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isApproved
                      ? "bg-emerald-400"
                      : isWaiting
                      ? "bg-amber-400 animate-pulse"
                      : isOccupied
                      ? "bg-rose-400"
                      : "bg-slate-400"
                  }`}
                />
                <span>{statusDisplay}</span>
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
            ) : user?.is_verifier ? (
              <span className="inline-flex items-center gap-1 text-xs font-label-sm uppercase tracking-wider text-slate-400 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all font-semibold">
                <span>Review</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
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
