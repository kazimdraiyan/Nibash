import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

const GOOGLE_MAPS_API_KEY = import.meta.env
  .VITE_GOOGLE_MAPS_API_KEY as string;

const GOOGLE_MAPS_MAP_ID = import.meta.env
  .VITE_GOOGLE_MAPS_MAP_ID as string;

let configured = false;

function ensureConfigured() {
  if (!configured) {
    setOptions({
      key: GOOGLE_MAPS_API_KEY,
      v: "weekly",
    });
    configured = true;
  }
}

interface ListingMapPreviewProps {
  latitude: number;
  longitude: number;
}

export function ListingMapPreview({
  latitude,
  longitude,
}: ListingMapPreviewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    ensureConfigured();

    (async () => {
      try {
        const { Map } = (await importLibrary(
          "maps"
        )) as google.maps.MapsLibrary;

        const { AdvancedMarkerElement } = (await importLibrary(
          "marker"
        )) as google.maps.MarkerLibrary;

        if (cancelled || !mapRef.current) return;

        const position = {
          lat: Number(latitude),
          lng: Number(longitude),
        };

        const map = new Map(mapRef.current, {
          center: position,
          zoom: 15,
          mapId: GOOGLE_MAPS_MAP_ID,
          colorScheme: google.maps.ColorScheme.DARK,
          renderingType: google.maps.RenderingType.VECTOR,

          // Make this a preview rather than an interactive map
          disableDefaultUI: true,
          gestureHandling: "none",
          clickableIcons: false,
          keyboardShortcuts: false,
        });

        new AdvancedMarkerElement({
          position,
          map,
        });
      } catch (err) {
        console.error("Google Maps error:", err);

        if (!cancelled) {
          setError("Map preview unavailable.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  if (error) {
    return (
      <div className="w-full h-72 rounded-xl bg-[#0d1017] border border-slate-800 flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-3xl text-slate-600 mb-2">
            location_off
          </span>
          <p className="text-xs text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-72 rounded-xl overflow-hidden border border-slate-800"
    />
  );
}