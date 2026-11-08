import { z } from "zod";
import { NEEDS, NYC_BOROUGHS } from "./types";

export const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Day = (typeof DAYS)[number];

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
/** [open, close] in New York time. A close at or before the open runs past midnight. */
const window = z.tuple([clock, clock]);

export const hoursSchema = z.union([z.literal("24/7"), z.partialRecord(z.enum(DAYS), z.array(window))]);
export type Hours = z.infer<typeof hoursSchema>;

export const resourceSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum([...NEEDS, "benefits"]),
    borough: z.enum(NYC_BOROUGHS),
    lat: z.number(),
    lng: z.number(),
    address: z.string().min(1),
    hours: hoursSchema.nullable(),
    acceptsChildren: z.boolean().nullable(),
    agesServed: z.array(z.object({ minAge: z.number(), maxAge: z.number() })).nullable(),
    phone: z.string().nullable(),
    sourceUrl: z.url(),
    verifiedAt: z.iso.date().nullable(),
    /** Plain context a person should know (hours quirks, what to bring). Not a disagreement between sources. */
    note: z.string().nullable(),
    /** Only where sources disagree. Shown as a conflict, never silently resolved. */
    conflict: z.string().nullable(),
  })
  .refine((r) => r.phone === null || r.verifiedAt !== null, "a phone number needs a verified source");

export type Resource = z.infer<typeof resourceSchema>;
