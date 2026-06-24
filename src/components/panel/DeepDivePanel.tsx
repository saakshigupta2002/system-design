"use client";

import { useState } from "react";
import { Plus, X, ChevronDown, ChevronRight } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useModeStore } from "@/store/modeStore";
import { useDeepDiveStore } from "@/store/deepDiveStore";
import { getProblemById } from "@/data/problems";
import { getInterviewData } from "@/data/interviewData";
import { scoreDeepDive } from "@/scoring/deepDive";
import type { Consistency, EntityStoreType, UserApi, UserEntity } from "@/types/deepDive";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const ENTITY_TYPES: EntityStoreType[] = ["sql", "nosql", "cache", "search"];
const CONSISTENCY: { value: Consistency; label: string }[] = [
  { value: "strong", label: "Strong" },
  { value: "eventual", label: "Eventual" },
  { value: "mixed", label: "Mixed" },
];

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{children}</p>;
}

export function DeepDivePanel() {
  const skillMode = useModeStore((s) => s.skillMode);
  const problemId = useAppStore((s) => s.selectedProblemId);
  const entry = useDeepDiveStore((s) => s.byProblem[problemId]) ?? {};
  const updateEntry = useDeepDiveStore((s) => s.updateEntry);
  const problem = getProblemById(problemId);
  const idata = getInterviewData(problemId);
  const [showRefApis, setShowRefApis] = useState(false);
  const [showRefEntities, setShowRefEntities] = useState(false);

  if (skillMode !== "advanced") {
    return (
      <p className="text-xs leading-relaxed text-zinc-500">
        Switch to <span className="font-medium text-zinc-300">Advanced</span> mode (top bar) to
        capture the API, data model, and consistency decisions interviews dig into.
      </p>
    );
  }
  if (!problem) {
    return <p className="text-xs text-zinc-500">Pick a problem to start the deep dive.</p>;
  }

  const apis = entry.apis ?? [];
  const entities = entry.entities ?? [];
  const setApis = (next: UserApi[]) => updateEntry(problemId, { apis: next });
  const setEntities = (next: UserEntity[]) => updateEntry(problemId, { entities: next });
  const grade = scoreDeepDive(entry, problem);

  return (
    <div className="space-y-5">
      {/* Live score */}
      <div className="flex items-center justify-between rounded-md border border-purple-500/20 bg-purple-500/[0.06] px-3 py-2">
        <div>
          <p className="text-xs font-semibold text-zinc-200">Deep-Dive score</p>
          <p className="text-[10px] text-zinc-500">Folded into your Advanced score (20 of 100)</p>
        </div>
        <span className="font-mono text-lg font-bold text-purple-300">
          {grade.score}
          <span className="text-xs font-normal text-zinc-500">/{grade.maxScore}</span>
        </span>
      </div>

      {/* APIs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionHeader>API Endpoints</SectionHeader>
          <button onClick={() => setApis([...apis, { method: "GET", path: "" }])} className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300">
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        {apis.length === 0 && <p className="text-[11px] text-zinc-600">List your core endpoints, e.g. POST /urls.</p>}
        {apis.map((api, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <select
              value={api.method}
              onChange={(e) => setApis(apis.map((a, idx) => (idx === i ? { ...a, method: e.target.value } : a)))}
              className="rounded bg-zinc-800 px-1 py-1 font-mono text-[10px] text-zinc-200 outline-none"
            >
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input
              value={api.path}
              onChange={(e) => setApis(apis.map((a, idx) => (idx === i ? { ...a, path: e.target.value } : a)))}
              placeholder="/path/{id}"
              className="min-w-0 flex-1 rounded bg-zinc-800 px-2 py-1 font-mono text-[11px] text-zinc-200 outline-none placeholder:text-zinc-600"
            />
            <button onClick={() => setApis(apis.filter((_, idx) => idx !== i))} className="text-zinc-600 hover:text-rose-400" aria-label="Remove">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {idata && idata.referenceAPIs.length > 0 && (
          <ReferenceToggle open={showRefApis} onToggle={() => setShowRefApis((v) => !v)} label="reference APIs">
            {idata.referenceAPIs.map((a, i) => (
              <p key={i} className="font-mono text-[10px] text-zinc-400">
                <span className="text-cyan-500">{a.method}</span> {a.path}
              </p>
            ))}
          </ReferenceToggle>
        )}
      </div>

      {/* Data model */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionHeader>Data Model</SectionHeader>
          <button onClick={() => setEntities([...entities, { name: "", type: "nosql", partitionKey: "" }])} className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300">
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        {entities.length === 0 && <p className="text-[11px] text-zinc-600">Name each entity and its partition / shard key.</p>}
        {entities.map((ent, i) => (
          <div key={i} className="space-y-1 rounded-md bg-zinc-800/60 p-1.5">
            <div className="flex items-center gap-1.5">
              <input
                value={ent.name}
                onChange={(e) => setEntities(entities.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
                placeholder="entity (e.g. urls)"
                className="min-w-0 flex-1 rounded bg-zinc-800 px-2 py-1 font-mono text-[11px] text-zinc-200 outline-none placeholder:text-zinc-600"
              />
              <select
                value={ent.type}
                onChange={(e) => setEntities(entities.map((x, idx) => (idx === i ? { ...x, type: e.target.value as EntityStoreType } : x)))}
                className="rounded bg-zinc-800 px-1 py-1 text-[10px] text-zinc-200 outline-none"
              >
                {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button onClick={() => setEntities(entities.filter((_, idx) => idx !== i))} className="text-zinc-600 hover:text-rose-400" aria-label="Remove">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              value={ent.partitionKey}
              onChange={(e) => setEntities(entities.map((x, idx) => (idx === i ? { ...x, partitionKey: e.target.value } : x)))}
              placeholder="partition / shard key"
              className="w-full rounded bg-zinc-800 px-2 py-1 font-mono text-[10px] text-zinc-300 outline-none placeholder:text-zinc-600"
            />
          </div>
        ))}
        {idata && idata.dataModel.length > 0 && (
          <ReferenceToggle open={showRefEntities} onToggle={() => setShowRefEntities((v) => !v)} label="reference data model">
            {idata.dataModel.map((e) => (
              <p key={e.name} className="font-mono text-[10px] text-zinc-400">
                {e.name} <span className="text-zinc-600">({e.type}{e.partitionKey ? `, PK: ${e.partitionKey}` : ""})</span>
              </p>
            ))}
          </ReferenceToggle>
        )}
      </div>

      {/* Consistency */}
      <div className="space-y-2">
        <SectionHeader>Consistency</SectionHeader>
        <div className="flex gap-1.5">
          {CONSISTENCY.map((c) => (
            <button
              key={c.value}
              onClick={() => updateEntry(problemId, { consistency: c.value })}
              className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                entry.consistency === c.value
                  ? "bg-purple-500/15 text-purple-300"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <textarea
          value={entry.consistencyNote ?? ""}
          onChange={(e) => updateEntry(problemId, { consistencyNote: e.target.value })}
          placeholder="Why? e.g. redirects need a strong read of the mapping; analytics can be eventual."
          rows={2}
          className="w-full resize-none rounded-md bg-zinc-800 px-2 py-1.5 text-[11px] leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600"
        />
      </div>

      <p className="text-[10px] leading-relaxed text-zinc-600">
        Try to design these yourself first, then reveal the reference to compare. Hit{" "}
        <span className="font-medium text-zinc-400">Score</span> to fold this into your grade.
      </p>
    </div>
  );
}

function ReferenceToggle({
  open,
  onToggle,
  label,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-zinc-800">
      <button onClick={onToggle} className="flex w-full items-center gap-1 px-2 py-1.5 text-left text-[11px] text-zinc-500 hover:text-zinc-300">
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {open ? "Hide" : "Show"} {label}
      </button>
      {open && <div className="space-y-0.5 border-t border-zinc-800 px-2 py-1.5">{children}</div>}
    </div>
  );
}
