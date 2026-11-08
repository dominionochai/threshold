import { wavFromPcm } from "./wav.js";

const API = "https://generativelanguage.googleapis.com/v1beta/models";
export const VOICE_MODEL = process.env.THRESHOLD_VOICE_MODEL ?? "gemini-3.1-flash-tts-preview";
export const DEFAULT_VOICE = process.env.THRESHOLD_VOICE ?? "Sulafat";

/** Speech as a base64 WAV. `style` is acting direction: how the line should be said. */
export async function synthesizeWith(apiKey: string, text: string, style: string, voice = DEFAULT_VOICE): Promise<string> {
  const res = await fetch(`${API}/${VOICE_MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Say this the way a real person would on a phone call, ${style}, natural pace, never like an announcer: ${text}` }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${VOICE_MODEL} failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const pcm = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!pcm) throw new Error("The voice model returned no audio.");
  return wavFromPcm(pcm);
}
