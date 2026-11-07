import { z } from "zod";
import { edgeSchema } from "../engine/pathfinder";
import { resourceSchema } from "../engine/resource";
import edgesJson from "./edges.json";
import resourcesJson from "./resources.json";

// Parsed once at load: a record without a source URL or with an unverified phone fails loudly.
export const resources = z.array(resourceSchema).parse(resourcesJson);
export const edges = z.array(edgeSchema).parse(edgesJson);
