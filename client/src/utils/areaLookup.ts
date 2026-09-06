export interface DhakaArea {
  id: number;
  name: string;
  lat?: number;
  lng?: number;
}

export const DHAKA_AREAS: DhakaArea[] = [
  { id: 1, name: "Azimpur", lat: 23.7298, lng: 90.3854 },
  { id: 2, name: "Dhanmondi", lat: 23.7450, lng: 90.3767 },
  { id: 3, name: "Mohammadpur", lat: 23.7664, lng: 90.3586 },
  { id: 4, name: "Gulshan", lat: 23.7917, lng: 90.4167 },
  { id: 5, name: "Banani", lat: 23.7950, lng: 90.4047 },
  { id: 6, name: "Mirpur", lat: 23.8046, lng: 90.3631 },
  { id: 7, name: "Khilkhet", lat: 23.8311, lng: 90.4243 },
  { id: 8, name: "Uttara", lat: 23.8770, lng: 90.3770 },
  { id: 9, name: "Bashundhara", lat: 23.8167, lng: 90.4326 },
  { id: 10, name: "Tejgaon", lat: 23.7640, lng: 90.3917 },
  { id: 11, name: "Lalbagh", lat: 23.7198, lng: 90.3897 },
  { id: 12, name: "Badda", lat: 23.7716, lng: 90.4274 },
];

const AREA_MAP: Record<number, string> = {
  1: "Azimpur",
  2: "Dhanmondi",
  3: "Mohammadpur",
  4: "Gulshan",
  5: "Banani",
  6: "Mirpur",
  7: "Khilkhet",
  8: "Uttara",
  9: "Bashundhara",
  10: "Tejgaon",
  11: "Lalbagh",
  12: "Badda",
};

/**
 * Resolves an area code / ID to a human-readable Dhaka area name.
 * Handles missing, null, or invalid area codes gracefully.
 */
export function getAreaName(areaId?: number | string | null): string {
  if (areaId === undefined || areaId === null || areaId === "") {
    return "Dhaka";
  }
  const numericId = Number(areaId);
  if (isNaN(numericId)) {
    return String(areaId);
  }
  return AREA_MAP[numericId] || `Area #${numericId}`;
}
