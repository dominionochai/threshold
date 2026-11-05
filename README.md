# Threshold

Threshold is a prototype for helping a household move from an immediate need toward a reviewed handoff and claim-ready case record. It is designed around tap-first household needs, directory-based resource research, simulated browser voice rehearsal, handoff review, and evidence organization for claim readiness.

This is a prototype—not an emergency service, benefits provider, caseworker, or live booking system. It does not contact a facility or file a claim for anyone.

## What the prototype demonstrates

1. **Capture household needs with taps.** A household can describe needs and relevant details in a structured case.
2. **Research resources through directories.** The app uses locally seeded resource records based on directory sources to help explore possible options.
3. **Rehearse an outreach conversation in the browser.** Browser speech features can support a simulated role-play; this is not a telephone call.
4. **Review a handoff.** The prototype can prepare or reject a handoff record for review. A prepared handoff does not mean it was sent or delivered.
5. **Organize a demo case toward claim readiness.** Case and evidence screens illustrate how information might be gathered. They do not submit an application or determine eligibility.

## What is real, and what is simulated

- Resource source URLs are real directory URLs. A URL to a directory is not verification of a particular local listing: facility matches, contact details, eligibility, opening hours, distance, and current availability have not been verified.
- Case and evidence handling is a demonstration. Any suggested match, handoff, call outcome, or claim-readiness status is not a confirmed real-world result.
- Voice rehearsal is simulated in the browser. **No real phone calls are made, and no bookings or appointments are placed.**
- The call transcript is not persisted in the case record. Treat rehearsal text as temporary demo data, not a saved record.
- There is no integration that files or submits a benefits claim.

## Technology

- Next.js 15 App Router and TypeScript
- Tailwind CSS
- `better-sqlite3` for the prototype's local case, resource, and handoff data
- Vitest for engine tests

**Agent-Native was not used.**

## Run locally

Use Node.js 20.9 or newer and pnpm. From the repository root, run:

```sh
pnpm install && pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Tests

Run the test suite with:

```sh
pnpm test
```

Engine tests are authored in `src/engine/__tests__/`. They were **not executed as part of this README update**, and their execution status has not been observed here; no passing test result is claimed.

## Browser voice support

Chrome and Edge are the supported targets for browser voice rehearsal. Firefox and Safari have partial support; behavior depends on the browser's available speech APIs. Voice rehearsal remains a prototype interaction and does not connect to telephony.

## Not finished

- The repo owner is writing `app/case/[id]/page.tsx`. Its intended end-to-end wiring may still be incomplete or not yet committed in its final form; this README change does not modify that file.
- Browser, camera, and voice end-to-end behavior has not been verified.
- There is no real telephony or live service-provider integration; no call, booking, or appointment is made.
- Resource data lacks verified facility location, eligibility, opening hours, phone details, and distance. Availability is also unverified.
- There is no actual benefits-claim integration or submission.
- Tests are authored, but execution status has not been observed. Do not interpret their presence as evidence that they pass.
