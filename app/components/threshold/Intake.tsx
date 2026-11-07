import { useActionMutation } from "@agent-native/core/client/hooks";
import { useState } from "react";
import { NEIGHBORHOODS } from "@shared/data/neighborhoods";
import { NEEDS, NYC_BOROUGHS, type Need } from "@shared/engine/types";

const NEED_LABEL: Record<Need, string> = { food: "Food tonight", bed: "A place to sleep", medical: "Medical care", legal: "Legal help" };
const AGES = Array.from({ length: 18 }, (_, age) => age);

const tap = (on: boolean) =>
  `rounded-xl border px-4 py-3 text-left text-base ${on ? "border-amber-400 bg-amber-400 text-zinc-950" : "border-zinc-700 bg-zinc-900 text-zinc-100"}`;

export function Intake() {
  const [location, setLocation] = useState<string>();
  const [ages, setAges] = useState<number[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const { mutate, isPending, error } = useActionMutation("create-case");
  const toggle = (need: Need) => setNeeds((n) => (n.includes(need) ? n.filter((x) => x !== need) : [...n, need]));

  return (
    <main className="mx-auto min-h-full max-w-md space-y-8 bg-zinc-950 p-5 pb-28 text-zinc-100">
      <h1 className="text-2xl font-semibold">Where are you right now?</h1>
      {NYC_BOROUGHS.map((borough) => (
        <section key={borough} className="space-y-2">
          <h2 className="text-sm uppercase tracking-wide text-zinc-400">{borough}</h2>
          <div className="grid grid-cols-2 gap-2">
            {NEIGHBORHOODS.filter((n) => n.borough === borough).map((n) => (
              <button key={n.name} className={tap(location === n.name)} onClick={() => setLocation(n.name)}>{n.name}</button>
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Children with you</h2>
        <p className="text-sm text-zinc-400">Tap each child's age. Tap a chip below to remove one.</p>
        <div className="grid grid-cols-6 gap-2">
          {AGES.map((age) => (
            <button key={age} className={tap(false) + " text-center"} onClick={() => setAges((a) => [...a, age])}>{age}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {ages.map((age, i) => (
            <button key={i} className={tap(true) + " py-1"} onClick={() => setAges((a) => a.filter((_, j) => j !== i))}>{age} ✕</button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">What do you need tonight?</h2>
        <div className="grid gap-2">
          {NEEDS.map((need) => (
            <button key={need} className={tap(needs.includes(need))} onClick={() => toggle(need)}>{NEED_LABEL[need]}</button>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950 p-4">
        {error && <p className="mb-2 text-sm text-rose-400">{error.message}</p>}
        <button
          disabled={!location || needs.length === 0 || isPending}
          className="mx-auto block w-full max-w-md rounded-xl bg-amber-400 py-4 text-lg font-semibold text-zinc-950 disabled:opacity-40"
          onClick={() => location && mutate({ location, childrenAges: ages, needs, language: "English" })}
        >
          Find what's open
        </button>
      </div>
    </main>
  );
}
