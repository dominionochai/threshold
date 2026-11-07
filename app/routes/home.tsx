import { useActionQuery } from "@agent-native/core/client/hooks";
import { CaseView } from "@/components/threshold/CaseView";
import { Intake } from "@/components/threshold/Intake";
import { APP_TITLE } from "@/lib/app-config";

export const meta = () => [{ title: APP_TITLE }];

export default function HomeRoute() {
  const { data: caseRecord, isLoading } = useActionQuery("get-case", {});
  if (isLoading) return null;
  return caseRecord ? <CaseView record={caseRecord} /> : <Intake />;
}
