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

1. Add `THRESHOLD_CALL_MODE=script` to `.env` (scripted is also the default; `live` uses the model).
2. Tab 1, `/home`: the app. Run intake, then tap **Have Threshold call** and approve.
3. Tab 2, `/staff`: the shelter's phone. It rings; press **Answer**, then reply by voice as the staff member.
4. Tab 1 follows the call live. When it ends, the step, the trail and the claim evidence update.

The caller's lines are fixed and filled in from the case, and the outcome is read from what staff said without a model. Everything else (Scout, approvals, evidence link) is the real app.
