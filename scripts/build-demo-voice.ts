/**
 * Records the caller's lines once, ahead of the demo, so they play instantly on stage.
 *   pnpm demo:voice                    every line
 *   pnpm demo:voice -- --only a3       just one, to re-record until it sounds right
 *   pnpm demo:voice -- --voice Aoede   try another voice
 * Needs GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY) in .env or the environment.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { DEMO_CALL } from "../shared/demo/call-script";
import { DEFAULT_VOICE, synthesizeWith } from "../server/lib/tts";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: the key may already be in the environment.
}

const flag = (name: string) => process.argv[process.argv.indexOf(`--${name}`) + 1];
const only = process.argv.includes("--only") ? flag("only") : undefined;
const voice = process.argv.includes("--voice") ? (flag("voice") ?? DEFAULT_VOICE) : DEFAULT_VOICE;
const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
if (!key) throw new Error("Set GOOGLE_GENERATIVE_AI_API_KEY in .env, then run this again.");

mkdirSync("public/demo-voice", { recursive: true });
for (const line of DEMO_CALL.agent.filter((l) => !only || l.id === only)) {
  for (let attempt = 1; ; attempt++) {
    try {
      writeFileSync(`public/demo-voice/${line.id}.wav`, Buffer.from(await synthesizeWith(key, line.text, line.style, voice), "base64"));
      console.log(`${line.id} recorded (${voice})`);
      break;
    } catch (e) {
      if (attempt === 4) throw e;
      console.log(`${line.id} attempt ${attempt} failed, retrying…`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}
