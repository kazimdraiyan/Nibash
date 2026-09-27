export interface AmenityMeta {
  name: string;
  icon: string;
  category?: string;
}

export const AMENITY_REGISTRY: Record<string, AmenityMeta> = {
  Garage: { name: "Garage", icon: "garage", category: "Parking & Access" },
  "Rooftop Access": { name: "Rooftop Access", icon: "deck", category: "Recreation & Lifestyle" },
  Elevator: { name: "Elevator", icon: "elevator", category: "Building Infrastructure" },
  "Generator Backup": { name: "Generator Backup", icon: "bolt", category: "Utilities" },
  Generator: { name: "Generator", icon: "bolt", category: "Utilities" },
  "Gas Line": { name: "Gas Line", icon: "local_gas_station", category: "Utilities" },
  "WASA Water": { name: "WASA Water", icon: "water_drop", category: "Utilities" },
  "Security Guard": { name: "Security Guard", icon: "security", category: "Safety & Security" },
  CCTV: { name: "CCTV", icon: "videocam", category: "Safety & Security" },
  Intercom: { name: "Intercom", icon: "phone_in_talk", category: "Safety & Security" },
  "Internet Ready": { name: "Internet Ready", icon: "wifi", category: "Connectivity" },
  "Prayer Room": { name: "Prayer Room", icon: "mosque", category: "Community" },
  "Fire Safety": { name: "Fire Safety", icon: "fire_extinguisher", category: "Safety & Security" },
  "Swimming Pool": { name: "Swimming Pool", icon: "pool", category: "Recreation & Lifestyle" },
  Gym: { name: "Gym", icon: "fitness_center", category: "Recreation & Lifestyle" },
  Playground: { name: "Playground", icon: "sports_soccer", category: "Recreation & Lifestyle" },
  "Community Hall": { name: "Community Hall", icon: "groups", category: "Community" },
  "Solar panels": { name: "Solar panels", icon: "solar_power", category: "Eco & Green Energy" },
  "Solar Panels": { name: "Solar Panels", icon: "solar_power", category: "Eco & Green Energy" },
};

export const DEFAULT_AMENITY_ICON = "check_circle";

export function getAmenityIcon(name: string): string {
  if (!name) return DEFAULT_AMENITY_ICON;
  if (AMENITY_REGISTRY[name]) return AMENITY_REGISTRY[name].icon;
  const matchedKey = Object.keys(AMENITY_REGISTRY).find(
    (key) => key.toLowerCase() === name.trim().toLowerCase()
  );
  return matchedKey ? AMENITY_REGISTRY[matchedKey].icon : DEFAULT_AMENITY_ICON;
}

export function getAmenityMeta(name: string): AmenityMeta {
  if (!name) {
    return { name: "Amenity", icon: DEFAULT_AMENITY_ICON };
  }
  if (AMENITY_REGISTRY[name]) return AMENITY_REGISTRY[name];
  const matchedKey = Object.keys(AMENITY_REGISTRY).find(
    (key) => key.toLowerCase() === name.trim().toLowerCase()
  );
  if (matchedKey) return AMENITY_REGISTRY[matchedKey];
  return {
    name,
    icon: DEFAULT_AMENITY_ICON,
    category: "Other",
  };
}
