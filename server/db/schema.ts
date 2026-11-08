import { bigint, boolean, jsonb, integer, pgTable, text } from "drizzle-orm/pg-core";

export const households = pgTable("households", {
  id: text("id").primaryKey(),
  children: jsonb("children").$type<number[]>().notNull(),
  location: text("location").notNull(),
  language: text("language").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const needs = pgTable("needs", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull(),
  need: text("need").notNull(),
  priority: integer("priority").notNull(),
});

export const steps = pgTable("steps", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull(),
  need: text("need").notNull(),
  status: text("status").notNull(),
  resourceId: text("resource_id"),
});

/** The activity trail. It doubles as the evidence ledger for the SNAP claim. */
export const events = pgTable("events", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
});

export const claimRequirements = pgTable("claim_requirements", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull(),
  requirement: text("requirement").notNull(),
  verified: boolean("verified").notNull(),
});

export const calls = pgTable("calls", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull(),
  stepId: text("step_id").notNull(),
  resourceId: text("resource_id").notNull(),
  status: text("status").notNull(),
  transcript: jsonb("transcript").$type<{ who: string; text: string }[]>().notNull(),
  outcome: jsonb("outcome"),
  /** The parent's yes that placed this call. */
  approvalId: text("approval_id"),
  startedAt: bigint("started_at", { mode: "number" }).notNull(),
});

/** A drafted outbound call. It stays pending until a person approves it, and keeps its outcome and transcript. */
export const approvals = pgTable("approvals", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull(),
  stepId: text("step_id").notNull(),
  resourceId: text("resource_id").notNull(),
  need: text("need").notNull(),
  script: jsonb("script").$type<string[]>().notNull(),
  status: text("status").notNull(),
  outcome: text("outcome"),
  transcript: jsonb("transcript").$type<{ speaker: "assistant" | "facility"; text: string }[]>(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  decidedAt: bigint("decided_at", { mode: "number" }),
});
