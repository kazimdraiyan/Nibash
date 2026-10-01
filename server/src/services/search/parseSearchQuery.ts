export interface ParsedSearchQuery {
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  maxRent: number | null;
  pets: boolean | null;
  areaHint: string | null;
  keywords: string;
}

const KNOWN_AREAS = [
  "Azimpur",
  "Dhanmondi",
  "Mohammadpur",
  "Gulshan",
  "Banani",
  "Mirpur",
  "Khilkhet",
  "Uttara",
  "Bashundhara",
  "Tejgaon",
  "Lalbagh",
  "Badda",
];

export function parseSearchQuery(query: string | null | undefined): ParsedSearchQuery {
  const result: ParsedSearchQuery = {
    bedrooms: null,
    bathrooms: null,
    floor: null,
    maxRent: null,
    pets: null,
    areaHint: null,
    keywords: "",
  };

  if (!query || typeof query !== "string") {
    return result;
  }

  let text = query.trim();
  if (!text) {
    return result;
  }

  // 1. Extract bedrooms (e.g., "3 bedroom", "2 bedrom", "2 bed", "4 bhk", "1br", "2 beds")
  const bedroomRegex = /\b(\d+)\s*(?:-|–)?\s*(?:bedrooms?|bedroms?|beds?|bhk|br)\b/i;
  const bedMatch = text.match(bedroomRegex);
  if (bedMatch) {
    result.bedrooms = parseInt(bedMatch[1], 10);
    text = text.replace(bedMatch[0], " ");
  }

  // 2. Extract bathrooms with typo tolerance (e.g., "2 bath", "2 bathrom", "3 bathrooms", "2 washroom", "2 washrom")
  const bathroomRegex = /\b(\d+)\s*(?:-|–)?\s*(?:bathrooms?|bathroms?|baths?|washrooms?|washroms?|toilets?)\b/i;
  const bathMatch = text.match(bathroomRegex);
  if (bathMatch) {
    result.bathrooms = parseInt(bathMatch[1], 10);
    text = text.replace(bathMatch[0], " ");
  }

  // 3. Extract floor number (e.g. "6th floor", "6 floor", "6th flor", "floor 6", "level 4", "ground floor")
  if (/\bground\s*(?:-|–)?\s*(?:floors?|flors?|fl|levels?)\b/i.test(text)) {
    result.floor = 0;
    text = text.replace(/\bground\s*(?:-|–)?\s*(?:floors?|flors?|fl|levels?)\b/i, " ");
  } else {
    const ordinalFloorRegex = /\b(\d+)(?:st|nd|rd|th)?\s*(?:-|–)?\s*(?:floors?|flors?|fl|levels?)\b/i;
    const floorMatch = text.match(ordinalFloorRegex);
    if (floorMatch) {
      result.floor = parseInt(floorMatch[1], 10);
      text = text.replace(floorMatch[0], " ");
    } else {
      const prefixFloorRegex = /\b(?:floors?|flors?|fl|levels?)\s*(?:no\.?|number|#)?\s*(\d+)\b/i;
      const prefixMatch = text.match(prefixFloorRegex);
      if (prefixMatch) {
        result.floor = parseInt(prefixMatch[1], 10);
        text = text.replace(prefixMatch[0], " ");
      }
    }
  }

  // 3. Extract maxRent / budget (e.g., "under 30k", "below 25000", "max 40k", "budget 50000", "up to 35k")
  const budgetPrefixRegex =
    /\b(?:under|below|max|budget|up\s+to)\s*(?:rent\s*)?(?:of\s*)?(?:৳|tk|bdt)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|lakh)?\b/i;
  const budgetMatch = text.match(budgetPrefixRegex);
  if (budgetMatch) {
    let amount = parseFloat(budgetMatch[1]);
    const unit = budgetMatch[2]?.toLowerCase();
    if (unit === "k" || unit === "thousand") {
      amount *= 1000;
    } else if (unit === "lakh") {
      amount *= 100000;
    }
    result.maxRent = Math.round(amount);
    text = text.replace(budgetMatch[0], " ");
  }

  // 4. Extract pets friendliness (e.g., "pet friendly", "pets allowed", "pet ok")
  const petRegex = /\b(?:pet|pets)\s*(?:friendly|allowed|ok)\b/i;
  const petMatch = text.match(petRegex);
  if (petMatch) {
    result.pets = true;
    text = text.replace(petMatch[0], " ");
  }

  // 5. Extract area hints
  // First check if an area is preceded by in/near/at/around
  const areaPrepositionRegex = new RegExp(
    `\\b(?:in|near|at|around)\\s+(${KNOWN_AREAS.join("|")})\\b`,
    "i",
  );
  const prepAreaMatch = text.match(areaPrepositionRegex);
  if (prepAreaMatch) {
    const matchedName = prepAreaMatch[1];
    const canonical = KNOWN_AREAS.find(
      (a) => a.toLowerCase() === matchedName.toLowerCase(),
    );
    result.areaHint = canonical || matchedName;
    text = text.replace(prepAreaMatch[0], " ");
  } else {
    // Check if any known area appears standalone
    const standaloneAreaRegex = new RegExp(
      `\\b(${KNOWN_AREAS.join("|")})\\b`,
      "i",
    );
    const standaloneMatch = text.match(standaloneAreaRegex);
    if (standaloneMatch) {
      const matchedName = standaloneMatch[1];
      const canonical = KNOWN_AREAS.find(
        (a) => a.toLowerCase() === matchedName.toLowerCase(),
      );
      result.areaHint = canonical || matchedName;
      text = text.replace(standaloneMatch[0], " ");
    }
  }

  // 6. Clean up residual text for full-text search keywords
  result.keywords = text
    .replace(/[^\w\s\u0980-\u09FF-]/g, " ") // preserve alphanumeric, Bengali characters, hyphens
    .replace(/\s+/g, " ")
    .trim();

  return result;
}
