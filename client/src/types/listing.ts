export interface ListingImage {
  id: number;
  url: string;
}

export interface Listing {
  id: string | number;
  title?: string;
  images?: ListingImage[];
  beds: number;
  baths: number;
  sqft?: number;
  price: number;
  location: string;
  propertyType?: "Apartment" | "Penthouse" | "Duplex" | "Studio";
  verified?: boolean;
  featured?: boolean;
  rating?: number;
  floor?: number;
  petAllowed?: boolean;
  tags?: string[];
}
