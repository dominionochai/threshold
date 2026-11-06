import type { Resource } from "../engine/types";

export const resources: Resource[] = [
  {
    id: "nyc-food-pantry-manhattan-1",
    name: "Manhattan Community Food Pantry",
    kind: "food",
    distanceKm: 1.2,
    acceptsChildren: true,
    agesServed: [{ minAge: 0, maxAge: 120 }],
    hours: "Mon-Fri 9am-4pm",
    openNow: true,
    phone: "+1-212-555-0199",
    address: "123 5th Ave, Manhattan, NY",
    sourceUrl: "https://www.nyc.gov/site/hra/help/food-assistance.page",
    verifiedAt: "2026-03-01",
    conflictNote: "Bring photo ID if available."
  },
  {
    id: "nyc-shelter-brooklyn-1",
    name: "Brooklyn Emergency Family Shelter",
    kind: "bed",
    distanceKm: 3.5,
    acceptsChildren: true,
    agesServed: [{ minAge: 0, maxAge: 17 }],
    hours: "24/7",
    openNow: true,
    phone: "+1-718-555-0144",
    address: "456 Atlantic Ave, Brooklyn, NY",
    sourceUrl: "https://www.nyc.gov/site/dss/homelessness/homelessness.page",
    verifiedAt: "2026-03-01",
    conflictNote: "Intake requires family composition verification."
  },
  {
    id: "nyc-health-queens-1",
    name: "Queens Community Health Clinic",
    kind: "medical",
    distanceKm: 2.8,
    acceptsChildren: true,
    agesServed: [{ minAge: 0, maxAge: 120 }],
    hours: "Mon-Sat 8am-6pm",
    openNow: true,
    phone: "+1-718-555-0188",
    address: "789 Queens Blvd, Queens, NY",
    sourceUrl: "https://www.nyc.gov/site/nycemed/index.page",
    verifiedAt: "2026-03-01"
  },
  {
    id: "nyc-legal-bronx-1",
    name: "Bronx Legal Aid Assistance",
    kind: "legal",
    distanceKm: 5.0,
    acceptsChildren: true,
    agesServed: [{ minAge: 0, maxAge: 120 }],
    hours: "Mon-Fri 9am-5pm",
    openNow: true,
    phone: "+1-718-555-0122",
    address: "321 Grand Concourse, Bronx, NY",
    sourceUrl: "https://www.nyc.gov/site/hra/help/legal-assistance.page",
    verifiedAt: "2026-03-01"
  }
];
