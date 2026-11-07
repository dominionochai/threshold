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
