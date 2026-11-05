'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  caseRecord: { id: string; children: number[]; needs: string[]; language: string };
  resource: { name: string; sourceUrl: string };
  onDraftMessage: (text: string) => void;
};

type TranscriptLine = { speaker: 'agent' | 'user'; text: string; at: string };
type CallStatus = 'Ready' | 'Dialling' | 'Ringing' | 'Connected' | 'Drafting' | 'Ended';
type RecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEventLike = { resultIndex: number; results: ArrayLike<RecognitionResultLike> };
type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type BrowserWindowWithRecognition = Window & {
  SpeechRecognition?: new () => RecognitionLike;
  webkitSpeechRecognition?: new () => RecognitionLike;
};

export default function CallPanel({ caseRecord, resource, onDraftMessage }: Props) {
  const [status, setStatus] = useState<CallStatus>('Ready');
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState('');
  const activeRef = useRef(false);
  const listenWantedRef = useRef(false);
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function addLine(line: TranscriptLine) {
    const next = [...transcriptRef.current, line];
    transcriptRef.current = next;
    setTranscript(next);
    return next;
  }

  function startListening() {
    if (!activeRef.current) return;
    const browserWindow = window as unknown as BrowserWindowWithRecognition;
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      listenWantedRef.current = false;
      setListening(false);
      setNotice('Microphone transcription is not supported by this browser. No caller speech was recorded.');
      return;
    }

    let recognition = recognitionRef.current;
    if (!recognition) {
      recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let partial = '';
        const finalParts: string[] = [];
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const words = result[0]?.transcript ?? '';
          if (result.isFinal) finalParts.push(words.trim());
          else partial += words;
        }
        setInterim(partial);
        const finalText = finalParts.filter(Boolean).join(' ').trim();
        if (finalText) {
          listenWantedRef.current = false;
          setListening(false);
          recognitionRef.current?.stop();
          void sendUserLine(finalText);
        }
      };
      recognition.onerror = (event) => {
        setListening(false);
        listenWantedRef.current = false;
        if (activeRef.current) {
          const reason = event.error === 'not-allowed' || event.error === 'service-not-allowed'
            ? 'Microphone permission was denied. No caller speech was recorded.'
            : `Microphone recognition failed (${event.error}). No unrecognized speech was added.`;
          setNotice(reason);
        }
      };
      recognition.onend = () => {
        setListening(false);
        if (activeRef.current && listenWantedRef.current) {
          window.setTimeout(() => startListening(), 150);
        }
      };
      recognitionRef.current = recognition;
    }

    listenWantedRef.current = true;
    try {
      recognition.start();
      setListening(true);
      setNotice('');
    } catch {
      listenWantedRef.current = false;
      setListening(false);
      setNotice('The browser could not start microphone recognition. Check microphone permission and try again.');
    }
  }

  function speak(text: string, after: () => void) {
    if (typeof window.speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') {
      setNotice('Browser speech playback is unavailable. The spoken line was not played.');
      after();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      after();
    };
    utterance.onerror = () => {
      setSpeaking(false);
      if (activeRef.current) setNotice('Browser speech playback failed.');
      after();
    };
    window.speechSynthesis.speak(utterance);
  }

  async function sendUserLine(text: string) {
    if (!activeRef.current) return;
    setInterim('');
    const userLine: TranscriptLine = { speaker: 'user', text, at: new Date().toISOString() };
    const lines = addLine(userLine);
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(caseRecord.id)}/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'reply', transcript: lines }),
      });
      const data = await response.json().catch(() => null) as { text?: unknown } | null;
      if (!response.ok || typeof data?.text !== 'string' || !data.text.trim()) {
        throw new Error('The reply service did not return a usable response.');
      }
      if (!activeRef.current) return;
      const reply = data.text.trim();
      addLine({ speaker: 'agent', text: reply, at: new Date().toISOString() });
      speak(reply, startListening);
    } catch {
      if (activeRef.current) {
        setNotice('Could not get a simulated reply. Your recognized words are retained; listening will resume.');
        startListening();
      }
    }
  }

  function startCall() {
    if (status !== 'Ready') return;
    activeRef.current = true;
    setStatus('Dialling');
    setNotice('');
    timeoutRef.current = setTimeout(() => {
      if (activeRef.current) setStatus('Ringing');
    }, 700);
  }

  function answerCall() {
    if (status !== 'Ringing' || !activeRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus('Connected');
    const ages = caseRecord.children.length
      ? caseRecord.children.map((age) => `${age}`).join(', ')
      : 'none listed';
    const needs = caseRecord.needs.length ? caseRecord.needs.join(', ') : 'none listed';
    const greeting = `This is a simulated browser call; no one at the directory answered. I am calling ${resource.name} about a family with children aged ${ages}, with listed needs of ${needs}. Do you have space tonight, what ages do you accept, and how does intake work?`;
    addLine({ speaker: 'agent', text: greeting, at: new Date().toISOString() });
    speak(greeting, startListening);
  }

  async function endCall() {
    if (status === 'Ended' || status === 'Drafting') return;
    activeRef.current = false;
    listenWantedRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    recognitionRef.current?.abort();
    setListening(false);
    setSpeaking(false);
    setInterim('');
    if (typeof window.speechSynthesis !== 'undefined') window.speechSynthesis.cancel();
    setStatus('Drafting');
    setNotice('Preparing a draft from the confirmed transcript…');
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(caseRecord.id)}/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'draft', transcript: transcriptRef.current }),
      });
      const data = await response.json().catch(() => null) as { text?: unknown } | null;
      if (!response.ok || typeof data?.text !== 'string') {
        throw new Error('The draft service did not return text.');
      }
      onDraftMessage(data.text);
      setNotice('Draft sent to the message editor.');
    } catch {
      setNotice('The call ended, but a draft could not be prepared. No message was sent.');
    } finally {
      setStatus('Ended');
    }
  }

  useEffect(() => () => {
    activeRef.current = false;
    listenWantedRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    recognitionRef.current?.abort();
    if (typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined') {
      window.speechSynthesis.cancel();
    }
  }, []);

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm" aria-label="Simulated call panel">
      <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
        SIMULATED CALL — no real call is placed. Voice runs in your browser.
      </p>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{resource.name}</h2>
          <a className="text-sm text-blue-700 underline" href={resource.sourceUrl} target="_blank" rel="noreferrer">
            View resource source
          </a>
        </div>
        <div className="text-right">
          <p className="text-sm" aria-live="polite">Status: <strong>{status}</strong></p>
          <p className="text-xs font-semibold tracking-wide text-amber-800">UNCONFIRMED</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-40" onClick={startCall} disabled={status !== 'Ready'}>
          Start
        </button>
        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-40" onClick={answerCall} disabled={status !== 'Ringing'}>
          Answer
        </button>
        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-40" onClick={endCall} disabled={status === 'Drafting' || status === 'Ended'}>
          End call &amp; draft message
        </button>
        <span className="text-sm text-slate-600" aria-live="polite">
          {speaking ? 'Speaking' : listening ? 'Listening' : status === 'Connected' ? 'Connected · voice idle' : ''}
        </span>
      </div>

      {notice && <p className="text-sm text-slate-700" role="status">{notice}</p>}
      {interim && <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600" aria-live="polite">Hearing: {interim}</p>}

      <ol className="space-y-3" aria-label="Call transcript">
        {transcript.map((line, index) => (
          <li className="rounded-md border border-slate-100 p-3" key={`${line.at}-${index}`}>
            <p className="mb-1 text-xs text-slate-500">
              <strong className="text-slate-700">{line.speaker === 'agent' ? 'Agent' : 'You'}</strong>
              {' · '}{new Date(line.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </p>
            <p className="whitespace-pre-wrap text-sm">{line.text}</p>
          </li>
        ))}
      </ol>
      <p className="text-xs text-slate-500">Language: {caseRecord.language}</p>
    </section>
  );
}
