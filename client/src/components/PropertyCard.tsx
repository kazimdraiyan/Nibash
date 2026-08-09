import type { Listing } from "../types/listing";

export function PropertyCard({ listing }: { listing: Listing }) {
    return (
        <div className="border-hairline rounded-xl overflow-hidden group hover:bg-surface-container-low transition-colors duration-300">
            <div className="relative h-64 w-full border-b border-hairline overflow-hidden">
                <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    src={listing.imageUrl}
                    alt={listing.imageAlt}
                />
                <button className="absolute top-4 right-4 bg-surface-container-lowest p-1.5 rounded-full border border-outline-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-sm">favorite_border</span>
                </button>
            </div>

            <div className="grid grid-cols-3 border-b border-hairline">
                <Stat label="Beds" value={listing.beds} />
                <Stat label="Baths" value={listing.baths} />
                <Stat label="Sqft" value={listing.sqft} />
            </div>

            <div className="p-4 flex justify-between items-end">
                <div>
                    <div className="font-headline-md text-headline-md text-primary mb-1">
                        ৳ {listing.price.toLocaleString()}{" "}
                        <span className="font-body-md text-body-md text-on-surface-variant">/month</span>
                    </div>
                    <div className="font-body-md text-body-md text-on-surface-variant">{listing.location}</div>
                </div>
                <button className="w-10 h-10 rounded-full border-hairline flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors">
                    <span className="material-symbols-outlined">north_east</span>
                </button>
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="p-3 text-center border-r border-hairline last:border-r-0">
            <span className="block font-headline-md text-headline-md leading-none mb-1">{value}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">{label}</span>
        </div>
    );
}