const KM_TO_MILES = 0.621371;

/** Clock time in New York, where every place on file is. */
export const clock = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

export const miles = (km: number) => `${(km * KM_TO_MILES).toFixed(1)} mi`;

export const mapsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export type TravelMode = "walking" | "transit" | "driving";

/** Hands the trip to Google Maps for real turn-by-turn. We never draw streets ourselves. */
export const directionsUrl = (address: string, mode: TravelMode) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=${mode}`;
