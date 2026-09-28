import { AlertTriangle, ArrowRight, Check, ChevronDown, ChevronUp, Clock3, Database, FileText, Loader2, Search, Sparkles, Terminal, Zap } from 'lucide-react';
import type { Memory } from '@workspace/api-client-react';
import { useState } from 'react';

export function SeverityBadge({ value }: { value: string }) {
  const style = value === 'SEV-1' ? 'bg-[#f7d9cf] text-[#9a3d2e]' : value === 'SEV-2' ? 'bg-[#f9e8ba] text-[#875b0b]' : value === 'SEV-3' ? 'bg-[#d9e8d3] text-[#35653e]' : 'bg-[#dce3e9] text-[#496071]';
  return <span className={`mono inline-flex items-center rounded-md px-2 py-1 text-[10px] font-medium tracking-[.08em] ${style}`}>{value}</span>;
}

export function SectionLabel({ eyebrow, title, count }: { eyebrow: string; title: string; count?: string | number }) {
  return <div className="mb-4 flex items-end justify-between gap-3"><div><div className="eyebrow text-primary">{eyebrow}</div><h2 className="mt-1 text-[17px] font-extrabold tracking-[-.035em] text-foreground">{title}</h2></div>{count !== undefined && <span className="mono rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">{count}</span>}</div>;
}

export function MemoryCard({ memory, index, compact = false }: { memory: Memory; index: number; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const relevance = Math.round(memory.relevance <= 1 ? memory.relevance * 100 : memory.relevance);
  return (
    <article className={`group rounded-xl border border-card-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_8px_24px_hsl(224_29%_18%/.06)] ${compact ? '' : 'sm:p-5'}`} data-testid={`card-memory-${memory.id || index}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mono mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#e2f0e8] text-[11px] text-primary">{String(index + 1).padStart(2, '0')}</span>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2"><span className="mono text-[10px] text-muted-foreground">{memory.incidentId || 'historical signal'}</span><span className="h-1 w-1 rounded-full bg-[#c4bda9]" /><span className="text-[10px] font-semibold text-primary">{relevance}% match</span></div>
            <p className={`text-[13px] leading-[1.65] text-foreground/85 ${!expanded && !compact ? 'line-clamp-3' : ''}`}>{memory.text}</p>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={expanded ? 'Collapse memory' : 'Expand memory'} data-testid={`button-toggle-memory-${memory.id || index}`}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {expanded && <div className="mt-4 flex gap-2 border-t border-border pt-3"><Sparkles size={14} className="mt-0.5 shrink-0 text-[#c68a14]" /><p className="text-[11px] leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground/70">Why recalled:</span> {memory.whyRelevant}</p></div>}
      {!expanded && <button onClick={() => setExpanded(true)} className="mt-3 text-[11px] font-semibold text-primary hover:underline" data-testid={`button-show-memory-${memory.id || index}`}>See why this matters <ArrowRight size={12} className="ml-1 inline" /></button>}
    </article>
  );
}

export function EmptyMemories({ onSeed, seeding }: { onSeed: () => void; seeding: boolean }) {
  return <div className="rounded-2xl border border-dashed border-card-border bg-card/55 px-6 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e8eee5] text-primary"><Database size={22} /></span><h3 className="mt-4 text-[15px] font-bold">The memory bank is quiet</h3><p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-muted-foreground">Seed the workspace with a small set of realistic incidents, then run your first investigation against them.</p><button onClick={onSeed} disabled={seeding} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60" data-testid="button-seed-empty-memories">{seeding ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}{seeding ? 'Seeding memory bank…' : 'Seed demo memories'}</button></div>;
}

export function QueryError({ onRetry, label = 'Could not load this view.' }: { onRetry: () => void; label?: string }) {
  return <div className="rounded-2xl border border-[#e7c8bd] bg-[#fff4f0] p-6"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0 text-[#b85c48]" size={18} /><div><h3 className="text-sm font-bold text-[#71352b]">{label}</h3><p className="mt-1 text-xs leading-relaxed text-[#8f5c50]">The signal did not make it back to the ops room. Nothing was changed.</p><button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-md border border-[#dcaea0] bg-[#fffaf8] px-3 py-2 text-[11px] font-bold text-[#8b4436] hover:bg-[#fce9e2]" data-testid="button-retry-query"><Zap size={13} /> Retry connection</button></div></div></div>;
}

export function MemorySkeleton({ count = 3 }: { count?: number }) {
  return <div className="space-y-3" aria-label="Loading memories" data-testid="loading-memory-skeleton">{Array.from({ length: count }).map((_, i) => <div key={i} className="rounded-xl border border-card-border bg-card p-5"><div className="flex gap-3"><div className="skeleton h-7 w-7 rounded-lg" /><div className="flex-1"><div className="skeleton h-2.5 w-24 rounded" /><div className="skeleton mt-3 h-3 w-full rounded" /><div className="skeleton mt-2 h-3 w-4/5 rounded" /><div className="skeleton mt-4 h-2.5 w-20 rounded" /></div></div></div>)}</div>;
}

export function TraceList({ trace }: { trace: string[] }) {
  const icons = [Search, Database, Sparkles, Check];
  return <div className="relative space-y-0" data-testid="list-memory-trace">{trace.map((item, index) => { const Icon = icons[index % icons.length]; return <div className="relative flex gap-3 pb-5 last:pb-0" key={`${item}-${index}`} data-testid={`trace-step-${index}`}><div className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#b8d4c4] bg-[#e5f1e8] text-primary"><Icon size={13} /></div>{index < trace.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-10px)] w-px bg-[#c9dfd0]" />}<div className="pt-1"><div className="mono text-[10px] uppercase tracking-[.08em] text-muted-foreground">step {String(index + 1).padStart(2, '0')}</div><p className="mt-1 text-[12px] leading-relaxed text-foreground/80">{item}</p></div></div>; })}</div>;
}

export function OutcomeFields({ value, onChange }: { value: { actualRootCause: string; resolution: string; outcome: string; lessonsLearned: string }; onChange: (key: keyof typeof value, next: string) => void }) {
  const fields = [
    ['actualRootCause', 'Actual root cause', 'What did the incident turn out to be?'],
    ['resolution', 'Resolution', 'What change restored service?'],
    ['outcome', 'Outcome', 'What was the customer impact?'],
    ['lessonsLearned', 'Lessons learned', 'What should Hindsight remember?'],
  ] as const;
  return <div className="grid gap-3 sm:grid-cols-2">{fields.map(([key, label, placeholder]) => <label className="block" key={key}><span className="mb-1.5 block text-[11px] font-bold text-foreground/75">{label}</span><textarea value={value[key]} onChange={(e) => onChange(key, e.target.value)} placeholder={placeholder} rows={3} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-[12px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/65 focus:border-primary focus:ring-2 focus:ring-primary/10" data-testid={`input-outcome-${key}`} /></label>)}</div>;
}

export function StatPill({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"><Icon size={14} className="text-primary" /><span className="text-[11px] text-muted-foreground">{label}</span><span className="mono ml-auto text-[11px] font-medium text-foreground">{value}</span></div>;
}