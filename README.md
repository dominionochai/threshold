# Threshold

One case record for a household in New York City across two clocks: tonight's crisis (food, a bed, medical, legal) and the SNAP claim that follows. What happens tonight is logged to the activity trail, and that trail is the evidence for the claim.

Built on Agent-Native: every operation is an action in `actions/`, so the UI, the in-app agent, HTTP and MCP all call the same code.

```
pnpm install
pnpm dev      # http://localhost:8080, set AUTH_DISABLED=true in .env to skip sign-in locally
pnpm test
pnpm typecheck
```

- `shared/engine` pure logic: eligibility, open-now hours (New York time), Scout ranking, Pathfinder fallback, claim gaps.
- `shared/data` resources and referral edges as validated JSON, neighborhood centers. A record without a source URL fails at load. Coordinates are approximate and used only for distance.
- `server/db` Drizzle schema and migrations. `actions/` the shared operations. `app/` the screens.

Data rule: nothing is invented. Records confirmed against an official source carry a verified date; everything else shows as unverified, and sources that disagree are shown as a conflict, not silently resolved.

## Demo: two tabs

Tab 1 (`/home`) is the app. Tab 2 (`/staff`) is the shelter's phone: it rings, plays the caller's pre-recorded voice, and listens for you to answer. The full script, your lines, and setup are in [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md). Record the voice once with `pnpm demo:voice`.

Set `THRESHOLD_CALL_MODE=live` for a model-driven caller with a transcript instead.
