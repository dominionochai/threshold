import { useActionMutation } from "@agent-native/core/client/hooks";
import { IconAlertTriangle, IconCheck, IconCurrentLocation, IconMapPin, IconMicrophone, IconPlayerStop } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NEIGHBORHOODS } from "@shared/data/neighborhoods";
import { nearestNeighborhood, parseAgeList, parseStory } from "@shared/engine/story";
import { NEED_LABEL, NEEDS, type Need } from "@shared/engine/types";
import { cn } from "@/lib/utils";
import { Shell } from "./Shell";
import { Heading, PrimaryButton } from "./ui";

interface Recognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognizerCtor = new () => Recognizer;

function recognizerCtor(): RecognizerCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognizerCtor; webkitSpeechRecognition?: RecognizerCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const VOICE_ERRORS: Record<string, string> = {
  "not-allowed": "The microphone is blocked. Allow it in your browser settings, or type instead.",
  "service-not-allowed": "The microphone is blocked. Allow it in your browser settings, or type instead.",
  "no-speech": "We didn't hear anything. Tap the microphone and try again.",
};

function Emergency({ kind }: { kind: "911" | "988" }) {
  return (
    <div role="alert" className="th-in flex items-start gap-3 rounded-[20px] border border-th-closed/60 bg-th-closed/10 p-4">
      <IconAlertTriangle className="mt-0.5 size-6 shrink-0 text-th-closed" aria-hidden="true" />
      <div className="space-y-2">
        {kind === "911" ? (
          <>
            <p className="text-[17px] font-semibold">If someone is in danger right now, call 911.</p>
            <a href="tel:911" className="inline-flex min-h-12 items-center rounded-xl bg-th-closed px-5 text-[17px] font-semibold text-th-ink">
              Call 911
            </a>
          </>
        ) : (
          <>
            <p className="text-[17px] font-semibold">You don't have to face this alone. Call or text 988 right now.</p>
            <p className="text-[15px] text-th-muted">The 988 Suicide & Crisis Lifeline is free and open all night.</p>
            <div className="flex gap-2">
              <a href="tel:988" className="inline-flex min-h-12 items-center rounded-xl bg-th-closed px-5 text-[17px] font-semibold text-th-ink">
                Call 988
              </a>
              <a href="sms:988" className="inline-flex min-h-12 items-center rounded-xl border border-th-closed/60 px-5 text-[17px] font-semibold">
                Text 988
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function TellUs() {
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [typedPlace, setTypedPlace] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [kidAges, setKidAges] = useState("");
  const [added, setAdded] = useState<Need[]>([]);
  const [removed, setRemoved] = useState<Need[]>([]);
  const recognizer = useRef<Recognizer | null>(null);
  const { mutate, isPending, error } = useActionMutation("create-case");

  useEffect(() => {
    setVoiceSupported(recognizerCtor() !== null);
    return () => recognizer.current?.stop();
  }, []);

  const story = useMemo(() => parseStory(`${text} ${interim}`), [text, interim]);
  const needs = NEEDS.filter((n) => (story.needs.includes(n) || added.includes(n)) && !removed.includes(n));
  const extraAges = parseAgeList(kidAges);
  const ages = story.needsAges ? [...story.ages, ...extraAges] : story.ages;
  const agesOk = !story.needsAges || extraAges.length > 0;
  const location = NEIGHBORHOODS.find((n) => n.name.toLowerCase() === (typedPlace ?? story.location ?? "").trim().toLowerCase())?.name ?? null;

  const missing = !needs.length ? "Tell us what you need" : !location ? "Add where you are" : !agesOk ? "Add your children's ages" : null;

  function toggleNeed(need: Need) {
    if (needs.includes(need)) {
      setAdded((a) => a.filter((n) => n !== need));
      setRemoved((r) => [...r, need]);
    } else {
      setRemoved((r) => r.filter((n) => n !== need));
      setAdded((a) => [...a, need]);
    }
  }

  function toggleVoice() {
    if (listening) {
      recognizer.current?.stop();
      return;
    }
    const Ctor = recognizerCtor();
    if (!Ctor) return;
    setVoiceError(null);
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let heard = "";
      let partial = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript ?? "";
        if (result?.isFinal) heard += transcript;
        else partial += transcript;
      }
      if (heard) setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}${heard.trim()}`);
      setInterim(partial);
    };
    rec.onerror = (event) => setVoiceError(VOICE_ERRORS[event.error] ?? "Voice stopped working. You can type instead.");
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    recognizer.current = rec;
    rec.start();
    setListening(true);
  }

  function locateMe() {
    setPlaceError(null);
    if (!navigator.geolocation) return setPlaceError("This browser can't share your location. Type a neighborhood instead.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const near = nearestNeighborhood({ lat: coords.latitude, lng: coords.longitude });
        if (near) setTypedPlace(near.name);
        else setPlaceError("You seem to be outside New York City. Threshold covers the five boroughs for now.");
      },
      () => {
        setLocating(false);
        setPlaceError("We couldn't get your location. Type a neighborhood instead.");
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  function submit() {
    if (missing || !location) return;
    recognizer.current?.stop();
    mutate({ location, childrenAges: ages, needs, language: "English" });
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div className="space-y-2">
          <Heading>Tell us what's going on.</Heading>
          <p className="text-[17px] leading-snug text-th-muted">Say it or type it, in your own words. We'll find what's open near you tonight.</p>
        </div>

        {story.emergency ? <Emergency kind={story.emergency} /> : null}

        <div className={cn("rounded-[24px] border bg-th-surface p-4 transition-colors", listening ? "border-th-closed/60" : "border-th-line focus-within:border-th-amber/60")}>
          <label htmlFor="story" className="sr-only">
            Tell us what's going on
          </label>
          <textarea
            id="story"
            value={interim ? `${text}${text && !text.endsWith(" ") ? " " : ""}${interim}` : text}
            onChange={(e) => setText(e.target.value)}
            readOnly={listening}
            rows={6}
            placeholder="We were evicted today. I have two kids, 4 and 9, and we haven't eaten…"
            className="min-h-40 w-full resize-none bg-transparent text-[20px] leading-snug text-th-text placeholder:text-th-muted/70 focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-[15px] text-th-muted" aria-live="polite">
              {listening ? "Listening. Speak naturally." : voiceSupported ? "Tap the microphone to talk." : "Voice works in Chrome and Edge. You can type here."}
            </p>
            {voiceSupported ? (
              <button
                onClick={toggleVoice}
                aria-label={listening ? "Stop listening" : "Start talking"}
                className={cn(
                  "th-press flex size-16 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-th-amber",
                  listening ? "th-pulse bg-th-closed text-th-ink" : "bg-th-amber text-th-ink",
                )}
              >
                {listening ? <IconPlayerStop className="size-7" /> : <IconMicrophone className="size-7" />}
              </button>
            ) : null}
          </div>
          {voiceError ? (
            <p role="alert" className="pt-2 text-[15px] text-th-closed">
              {voiceError}
            </p>
          ) : null}
        </div>

        <div className="space-y-5">
          <section className="space-y-2">
            <h2 className="text-[17px] font-semibold">What we're hearing</h2>
            <div className="flex flex-wrap gap-2">
              {NEEDS.map((need) => {
                const on = needs.includes(need);
                return (
                  <button
                    key={need}
                    onClick={() => toggleNeed(need)}
                    aria-pressed={on}
                    className={cn(
                      "th-press flex min-h-12 items-center gap-2 rounded-full border px-4 text-[16px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-th-amber",
                      on ? "border-th-amber bg-th-amber/15 text-th-amber" : "border-th-line text-th-muted",
                    )}
                  >
                    {on ? <IconCheck className="size-4" aria-hidden="true" /> : null}
                    {NEED_LABEL[need]}
                  </button>
                );
              })}
            </div>
            <p className="text-[14px] text-th-muted">Tap to add or remove anything we got wrong.</p>
          </section>

          <section className="space-y-2">
            <label htmlFor="place" className="flex items-center gap-2 text-[17px] font-semibold">
              <IconMapPin className="size-5 text-th-muted" aria-hidden="true" />
              Where are you right now?
            </label>
            <div className="flex gap-2">
              <input
                id="place"
                list="neighborhoods"
                value={typedPlace ?? story.location ?? ""}
                onChange={(e) => setTypedPlace(e.target.value)}
                placeholder="A neighborhood, like Mott Haven"
                autoComplete="off"
                className="min-h-14 min-w-0 flex-1 rounded-2xl border border-th-line bg-th-surface px-4 text-[17px] placeholder:text-th-muted/70 focus:border-th-amber/60 focus:outline-none"
              />
              <button
                onClick={locateMe}
                disabled={locating}
                aria-label="Use my location"
                className="th-press flex size-14 shrink-0 items-center justify-center rounded-2xl border border-th-line bg-th-surface text-th-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-th-amber"
              >
                <IconCurrentLocation className={cn("size-6", locating && "animate-pulse")} />
              </button>
            </div>
            <datalist id="neighborhoods">
              {NEIGHBORHOODS.map((n) => (
                <option key={n.name} value={n.name}>
                  {n.borough}
                </option>
              ))}
            </datalist>
            {typedPlace && !location ? <p className="text-[14px] text-th-muted">Pick one from the list so we can find places near you.</p> : null}
            {placeError ? (
              <p role="alert" className="text-[14px] text-th-closed">
                {placeError}
              </p>
            ) : null}
          </section>

          {story.needsAges ? (
            <section className="th-in space-y-2">
              <label htmlFor="ages" className="text-[17px] font-semibold">
                How old are your children?
              </label>
              <input
                id="ages"
                inputMode="numeric"
                value={kidAges}
                onChange={(e) => setKidAges(e.target.value)}
                placeholder="For example: 4 and 9"
                className="min-h-14 w-full rounded-2xl border border-th-line bg-th-surface px-4 text-[17px] placeholder:text-th-muted/70 focus:border-th-amber/60 focus:outline-none"
              />
              <p className="text-[14px] text-th-muted">Places have age rules, so we ask. We never guess.</p>
            </section>
          ) : null}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-th-line/60 bg-th-ground/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto max-w-[460px] space-y-2 px-4 py-3">
          {error ? (
            <p role="alert" className="text-[15px] text-th-closed">
              {error.message}
            </p>
          ) : null}
          <PrimaryButton onClick={submit} disabled={missing !== null || isPending}>
            {isPending ? "Opening your case…" : (missing ?? "Find help now")}
          </PrimaryButton>
        </div>
      </div>
    </Shell>
  );
}
