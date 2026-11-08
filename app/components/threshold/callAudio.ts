import { createTurnDetector } from "@shared/engine/turn-detector";

/** Browser audio for the phone: a ring tone, playing the caller's voice, and listening to the staff member. */

export function startRinging(): () => void {
  const ctx = new AudioContext();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  for (const frequency of [440, 480]) {
    const tone = ctx.createOscillator();
    tone.frequency.value = frequency;
    tone.connect(gain);
    tone.start();
  }
  const burst = () => {
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime + 2);
  };
  burst();
  const timer = setInterval(burst, 6000);
  return () => {
    clearInterval(timer);
    void ctx.close();
  };
}

export function playWav(base64: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(`data:audio/wav;base64,${base64}`);
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("The voice could not be played."));
    void audio.play().catch(reject);
  });
}

/** Load every clip up front so each one plays the instant it is due. */
export function preloadClips(urls: readonly string[]): Promise<Map<string, HTMLAudioElement>> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<[string, HTMLAudioElement]>((resolve, reject) => {
          const audio = new Audio(url);
          audio.preload = "auto";
          audio.oncanplaythrough = () => resolve([url, audio]);
          audio.onerror = () => reject(new Error(`Missing voice file: ${url}`));
          audio.load();
        }),
    ),
  ).then((pairs) => new Map(pairs));
}

export function playClip(audio: HTMLAudioElement | undefined): Promise<void> {
  if (!audio) return Promise.resolve();
  audio.currentTime = 0;
  return new Promise((resolve) => {
    audio.onended = () => resolve();
    audio.onpause = () => resolve();
    void audio.play().catch(() => resolve());
  });
}

/**
 * Resolves when the person on this end has said something and stopped. It only measures
 * loudness (nothing is transcribed). Space or Enter moves on at once, and it never waits forever.
 */
export function waitForTurn(stream: MediaStream | null, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const STEP_MS = 50;
    const context = stream ? new AudioContext() : null;
    const analyser = context?.createAnalyser();
    if (context && analyser && stream) context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser?.fftSize ?? 0);
    const finished = createTurnDetector();

    const done = () => {
      clearInterval(timer);
      clearTimeout(giveUp);
      window.removeEventListener("keydown", onKey);
      signal.removeEventListener("abort", done);
      void context?.close();
      resolve();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "Enter") done();
    };
    const timer = setInterval(() => {
      if (!analyser) return;
      analyser.getFloatTimeDomainData(samples);
      const level = Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length);
      if (finished(level, STEP_MS)) done();
    }, STEP_MS);
    const giveUp = setTimeout(done, stream ? 15000 : 6000);
    window.addEventListener("keydown", onKey);
    signal.addEventListener("abort", done);
  });
}

export function speakInBrowser(text: string): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    speechSynthesis.speak(utterance);
  });
}

/** The browser's speech-recognition result event, which the shared global typings leave out. */
type ResultEvent = Event & { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> };

export const canListen = () => typeof window !== "undefined" && Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);

/** One spoken sentence from the microphone. Returns a function that stops listening. */
export function listen(handlers: { onInterim: (text: string) => void; onFinal: (text: string) => void; onEnd: () => void; onError: (message: string) => void }): () => void {
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Ctor) throw new Error("This browser cannot listen. Use Chrome, or type what the staff member says.");
  const recognition = new Ctor();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.addEventListener("result", (event) => {
    const { results } = event as ResultEvent;
    const last = results[results.length - 1];
    const text = last?.[0]?.transcript ?? "";
    if (last?.isFinal) handlers.onFinal(text);
    else handlers.onInterim(text);
  });
  recognition.addEventListener("error", () => handlers.onError("The microphone could not be used."));
  recognition.addEventListener("end", handlers.onEnd);
  recognition.start();
  return () => recognition.stop();
}
