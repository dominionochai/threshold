import { useActionQuery } from "@agent-native/core/client/hooks";
import { useEffect, useState } from "react";
import { Phone } from "@/components/threshold/Phone";
import { PhoneBoundary } from "@/components/threshold/PhoneBoundary";
import type { ActiveCall } from "@shared/engine/types";

export const meta = () => [{ title: "Threshold staff line" }];

/** The shelter's phone: rings when Threshold calls, plays its voice, and listens to the staff member. */
export default function StaffRoute() {
  const { data: record } = useActionQuery("get-case", {});
  // Keep the phone up after the call closes, so the outcome can be read before dismissing it.
  const [call, setCall] = useState<ActiveCall | null>(null);
  useEffect(() => {
    if (record?.activeCall) setCall(record.activeCall);
  }, [record?.activeCall]);

  if (!call || !record) {
    return <main className="grid min-h-full place-items-center bg-zinc-950 p-6 text-zinc-400">Waiting for a call…</main>;
  }
  return (
    <PhoneBoundary key={call.id} onClose={() => setCall(null)}>
      <Phone call={call} location={record.location} onClose={() => setCall(null)} />
    </PhoneBoundary>
  );
}
