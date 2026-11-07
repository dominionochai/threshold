import type { LatLng } from "../engine/geo";
import type { NYCBorough } from "../engine/types";

export interface Neighborhood extends LatLng {
  name: string;
  borough: NYCBorough;
}

/** Approximate neighborhood centers, used only as a starting point for distance. */
export const NEIGHBORHOODS: readonly Neighborhood[] = [
  { name: "Harlem", borough: "Manhattan", lat: 40.8116, lng: -73.9465 },
  { name: "Midtown", borough: "Manhattan", lat: 40.7549, lng: -73.984 },
  { name: "Lower East Side", borough: "Manhattan", lat: 40.715, lng: -73.9843 },
  { name: "Washington Heights", borough: "Manhattan", lat: 40.8417, lng: -73.9393 },
  { name: "Downtown Brooklyn", borough: "Brooklyn", lat: 40.6928, lng: -73.9903 },
  { name: "Bedford-Stuyvesant", borough: "Brooklyn", lat: 40.6872, lng: -73.9418 },
  { name: "Brownsville", borough: "Brooklyn", lat: 40.6612, lng: -73.9125 },
  { name: "Sunset Park", borough: "Brooklyn", lat: 40.6454, lng: -74.0124 },
  { name: "Mott Haven", borough: "Bronx", lat: 40.8089, lng: -73.9229 },
  { name: "Hunts Point", borough: "Bronx", lat: 40.813, lng: -73.883 },
  { name: "Morrisania", borough: "Bronx", lat: 40.8272, lng: -73.91 },
  { name: "Fordham", borough: "Bronx", lat: 40.8615, lng: -73.8903 },
  { name: "Jamaica", borough: "Queens", lat: 40.7027, lng: -73.789 },
  { name: "Flushing", borough: "Queens", lat: 40.7675, lng: -73.833 },
  { name: "Long Island City", borough: "Queens", lat: 40.7447, lng: -73.9485 },
  { name: "Far Rockaway", borough: "Queens", lat: 40.6054, lng: -73.755 },
  { name: "St. George", borough: "Staten Island", lat: 40.6437, lng: -74.0735 },
  { name: "Stapleton", borough: "Staten Island", lat: 40.6265, lng: -74.0775 },
];

export const findNeighborhood = (name: string) => NEIGHBORHOODS.find((n) => n.name === name);
