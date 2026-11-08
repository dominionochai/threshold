import { useActionQuery } from "@agent-native/core/client/hooks";
import { useEffect, useState } from "react";
import { Phone } from "@/components/threshold/Phone";
import { PhoneBoundary } from "@/components/threshold/PhoneBoundary";
import { StaffPhone } from "@/components/threshold/StaffPhone";
import type { ActiveCall } from "@shared/engine/types";

export const meta = () => [{ title: "Threshold staff line" }];

/** The shelter's phone. The scripted demo gets the bare phone; a live (model) call keeps the transcript phone. */
export default function StaffRoute() {
  const { data: record } = useActionQuery("get-case", {});
  const active = record?.activeCall ?? null;
  const [live, setLive] = useState<ActiveCall | null>(null);
  useEffect(() => {
    if (active && !active.scripted) setLive(active);
  }, [active]);

  if (live) {
    return (
      <PhoneBoundary key={live.id} onClose={() => setLive(null)}>
        <Phone call={live} location={record?.location ?? ""} onClose={() => setLive(null)} />
      </PhoneBoundary>
    );
  }
  return <StaffPhone call={active?.scripted ? active : null} />;
}
