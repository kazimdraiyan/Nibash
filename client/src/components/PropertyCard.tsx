import type { Listing } from "../types/listing";

export function PropertyCard({ listing }: { listing: Listing }) {
    return (
        <div className="border-hairline rounded-xl overflow-hidden group hover:bg-surface-container-low transition-colors duration-300">
            <div className="relative h-130 w-full overflow-hidden">
                <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    src={listing.imageUrl}
                    alt={listing.imageAlt}
                />
                <button className="absolute top-4 right-4 w-10 h-10 rounded-full border border-white/30 bg-black/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors">
                    <span className="material-symbols-outlined">favorite_border</span>
                </button>

                <div className="absolute bottom-0 w-full">
                    <div className="grid grid-cols-3 border border-white/20 bg-black/45 backdrop-blur-xl text-white shadow-sm">
                        <Stat label="Beds" value={listing.beds} />
                        <Stat label="Baths" value={listing.baths} />
                        <Stat label="Sqft" value={listing.sqft} />
                    </div>
                    <div className="p-4 flex justify-between items-end border-x border-b border-white/20 bg-black/45 backdrop-blur-xl text-white shadow-sm">
                        <div>
                            <div className="font-headline-md text-headline-md text-white mb-1">
                                ৳ {listing.price.toLocaleString()}{" "}
                                <span className="font-body-md text-body-md text-white/80">/month</span>
                            </div>
                            <div className="font-body-md text-body-md text-white/80 line-clamp-1">{listing.location}</div>
                        </div>
                        <button className="w-10 h-10 rounded-full border border-white/30 bg-black/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors">
                            <span className="material-symbols-outlined">north_east</span>
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="p-3 text-center border-r border-white/20 last:border-r-0">
            <span className="block font-headline-md text-headline-md leading-none mb-1">{value}</span>
            <span className="font-label-sm text-label-sm text-white/80 uppercase">{label}</span>
        </div>
    );
}