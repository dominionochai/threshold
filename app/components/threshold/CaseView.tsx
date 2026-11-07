import { useActionQuery } from "@agent-native/core/client/hooks";
import { useState } from "react";
import { findClaimGaps } from "@shared/engine/claim";
import type { CaseRecord } from "@shared/engine/types";
import { ApprovalSheet } from "./ApprovalSheet";
import { Claim } from "./Claim";
import { Shell, type Tab } from "./Shell";
import { Tonight, type Plan } from "./Tonight";

export function CaseView({ record }: { record: CaseRecord }) {
  const [tab, setTab] = useState<Tab>("tonight");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: plan } = useActionQuery("rank-resources", {});
  const open = record.approvals.find((a) => a.id === openId);

  return (
    <Shell tab={tab} onTab={setTab} bleed={tab === "tonight"} gaps={findClaimGaps(record.evidence).length}>
      {tab === "tonight" ? <Tonight record={record} plan={plan as Plan | undefined} onOpen={setOpenId} /> : <Claim record={record} />}
      {open ? <ApprovalSheet key={open.id + open.status} approval={open} onClose={() => setOpenId(null)} /> : null}
    </Shell>
  );
}
