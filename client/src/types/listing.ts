export interface Listing {
  id: string;
  title?: string;
  imageUrl: string;
  imageAlt?: string;
  beds: number;
  baths: number;
  sqft: number;
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

