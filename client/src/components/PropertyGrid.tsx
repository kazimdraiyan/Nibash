import { PropertyCard } from "./PropertyCard";
import type { Listing } from "../types/listing";

export function PropertyGrid({ listings }: { listings: Listing[] }) {
  return (
    <section className="max-w-[1440px] mx-auto px-container-padding py-section-gap">
      <div className="flex justify-between items-center mb-10">
        <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary leading-tight items-center">
          Latest in your area
        </h2>
        <a className="hidden md:inline-flex font-label-sm text-label-sm uppercase text-primary border-b border-primary hover:border-b-2 transition-all pb-1" href="#">
          View All Listings
        </a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {listings.map((listing) => (
          <PropertyCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  )
}