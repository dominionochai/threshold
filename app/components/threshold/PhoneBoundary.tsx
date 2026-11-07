import { Component, type ReactNode } from "react";

/** Keeps a failure inside the phone from taking down the case screen, and shows what actually went wrong. */
export class PhoneBoundary extends Component<{ onClose: () => void; children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
        <div className="max-w-sm space-y-3 rounded-2xl border border-zinc-700 bg-zinc-950 p-5 text-sm text-zinc-100">
          <p className="text-lg font-semibold">The call hit a problem</p>
          <p className="break-words text-rose-300">{this.state.error.message}</p>
          <button className="rounded-full bg-zinc-800 px-5 py-2" onClick={this.props.onClose}>Close</button>
        </div>
      </div>
    );
  }
}
