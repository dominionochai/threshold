# Demo script: the call to PATH

The caller's voice is recorded ahead of time, so every line plays the instant it is due. You talk; the app only listens for you to finish a sentence. It does not transcribe you, and nothing on the phone shows text.

## Before you go on stage (once)

1. Put `GOOGLE_GENERATIVE_AI_API_KEY=...` in `.env` and `THRESHOLD_CALL_MODE=script`.
2. Record the voice: `pnpm demo:voice`. Play the files in `public/demo-voice/` (a1 to a5). Re-record one line with `pnpm demo:voice -- --only a3`, or try another voice with `pnpm demo:voice -- --voice Aoede` (also good: Sulafat, Achird, Vindemiatrix, Leda). A human recording saved over the same file name beats any synthetic voice.
3. Commit `public/demo-voice/` so the files travel with the repo.
4. Open `/staff` once and allow the microphone. The lock screen says "Voice files missing" in red if a file is absent.

## The intake (tab 1, `/home`)

Say or type: "I'm in Harlem with my two kids, they're 2 and 2, and we have nowhere to sleep tonight." Confirm Harlem, ages 2 and 2, and a place to sleep. When Caller offers to call PATH, open the call sheet, read what it will say, and tap **Yes, make this call**. (The audio is recorded for exactly this case.)

## The call (tab 2, `/staff`)

Tab 1 now says Caller is calling, and the phone in tab 2 rings. Tap **Accept**. Speak naturally at a normal pace. Each of your lines takes about three seconds. After you stop speaking, it pauses a beat and answers.

| # | The caller says | You say |
|---|---|---|
| 1 | "Hello? Hi, this is Threshold. I'm an AI assistant, calling on behalf of a mother. Is this the PATH intake center?" | "Yes, this is PATH intake. How can I help you?" |
| 2 | "Thank you. She's in Harlem tonight with her two children, both two years old, and they need a place to sleep. Can you take them in tonight?" | "Yes, we can. We have a family room available tonight." |
| 3 | "Oh, thank goodness. Where should she go, and what time does she need to be there by?" | "Come to 151 East 151st Street in the Bronx, and please arrive before nine tonight." |
| 4 | "Okay, one fifty-one East one fifty-first Street, before nine. Is there anything she needs to bring?" | "Just bring any ID you have for her and the children." |
| 5 | "Perfect. I'll let her know right away. Thank you so much, you've been a big help. Goodbye." | (nothing, the call ends by itself) |

Say your lines as written or close to them. The case records the scripted lines above, so your exact wording does not matter to the result, but the call advances only when you speak and pause.

## What tab 1 shows afterwards

The bed step turns **confirmed**. The trail gets `CALL_COMPLETED` (marked as a scripted demo call) and `EVIDENCE_LINKED`. "Proof of residence or shelter status" reads as stated on a call, document still needed.

## If something goes wrong on stage

- **Press Space or Enter** on the staff tab to skip to the caller's next line at once.
- If the microphone is blocked, the call still runs: it waits six seconds between lines.
- Don't use speakers louder than the voice: the caller's own audio can leak into the mic. Headphones for you are safest.
- If a line sounds wrong, stop and re-record just that line before the next run.
