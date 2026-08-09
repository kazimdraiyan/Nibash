import { PropertyCard } from "./PropertyCard";
import type { Listing } from "../types/listing";

export function PropertyGrid({ listings }: { listings: Listing[] }) {
  return (
    <section className="max-w-[1440px] mx-auto px-container-padding py-section-gap border-t border-hairline">
      <div className="flex justify-between items-end mb-12">
        <h2 className="font-headline-md text-headline-md text-primary">Latest in your area</h2>
        <a className="hidden md:inline-flex font-label-sm text-label-sm uppercase text-primary border-b border-primary hover:border-b-2 transition-all pb-1" href="#">
          View All Properties
        </a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
        {listings.map((listing) => (
          <PropertyCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}