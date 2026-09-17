import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string;

let configured = false;
function ensureConfigured() {
  if (!configured) {
    setOptions({ key: GOOGLE_MAPS_API_KEY, v: "weekly" });
    configured = true;
  }
}

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}

export function LocationPicker({
  latitude,
  longitude,
  onChange,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureConfigured();

    (async () => {
      try {
        const { Map } = (await importLibrary(
          "maps",
        )) as google.maps.MapsLibrary;
        const { AdvancedMarkerElement } = (await importLibrary(
          "marker",
        )) as google.maps.MarkerLibrary;
        const { PlaceAutocompleteElement } = (await importLibrary(
          "places",
        )) as google.maps.PlacesLibrary;
        if (cancelled || !mapRef.current || !autocompleteContainerRef.current)
          return;

        const map = new Map(mapRef.current, {
          center: { lat: latitude, lng: longitude },
          zoom: 15,
          mapId: MAP_ID,
          colorScheme: google.maps.ColorScheme.DARK,
          renderingType: google.maps.RenderingType.VECTOR,
        });

        const marker = new AdvancedMarkerElement({
          position: { lat: latitude, lng: longitude },
          map,
          gmpDraggable: true,
        });

        marker.addListener("dragend", () => {
          const pos = marker.position;
          if (pos) onChange(Number(pos.lat), Number(pos.lng));
        });

        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          marker.position = e.latLng;
          onChange(e.latLng.lat(), e.latLng.lng());
        });

        const autocomplete = new PlaceAutocompleteElement({
          includedRegionCodes: ["bd"],
        });
        autocompleteContainerRef.current.appendChild(autocomplete);

        autocomplete.addEventListener("gmp-select", async (event: any) => {
          const place = event.placePrediction.toPlace();
          await place.fetchFields({ fields: ["location"] });
          const loc = place.location;
          if (!loc) return;
          map.panTo(loc);
          map.setZoom(16);
          marker.position = loc;
          onChange(loc.lat(), loc.lng());
        });

        setLoaded(true);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(
            "Failed to load Google Maps. Check your API key / referrer restrictions.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    // TODO: Style the autocomplete input to match the rest of the app
    <div className="flex flex-col gap-2">
      <div ref={autocompleteContainerRef} className="w-full" />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div
        ref={mapRef}
        className="w-full h-72 rounded-lg border border-slate-700 overflow-hidden"
      />
      {!loaded && !error && (
        <p className="text-xs text-slate-400">Loading map...</p>
      )}
      <p className="text-[11px] text-slate-500">
        Click the map or drag the pin to set the exact location. Lat:{" "}
        {latitude.toFixed(5)}, Lng: {longitude.toFixed(5)}
      </p>
    </div>
  );
}
