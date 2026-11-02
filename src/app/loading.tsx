import React from "react";
import { Loader2 } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian-950 text-slate-200">
      <div className="flex items-center gap-2.5 text-sm font-medium">
        <Loader2 className="h-5 w-5 animate-spin text-electric-400" />
        <span>Loading E-LEARNING ECOSYSTEM...</span>
      </div>
    </div>
  );
}
