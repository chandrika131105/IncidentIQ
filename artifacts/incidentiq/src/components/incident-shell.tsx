import { Activity, Archive, BrainCircuit, ChevronRight, CircleHelp, Database, History, Menu, Network, PanelLeft, Server, ShieldCheck, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import { getGetHealthQueryKey, getGetMemoryStatusQueryKey, getHealthCheckQueryKey, useGetHealth, useGetMemoryStatus, useHealthCheck } from '@workspace/api-client-react';

function ConfigStatus({ label, ready, loading }: { label: string; ready: boolean; loading: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-[12px] text-sidebar-foreground/75 hover:bg-sidebar-accent/60">
      <span className="flex min-w-0 items-center gap-2.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${loading ? 'pulse-dot bg-sidebar-foreground/45' : ready ? 'bg-[#b9de72]' : 'bg-[#ef8c71]'}`} />
        <span className="truncate">{label}</span>
      </span>
      <span className={`mono text-[10px] uppercase tracking-[.12em] ${ready ? 'text-[#b9de72]' : 'text-[#efab91]'}`}>
        {loading ? 'checking' : ready ? 'ready' : 'off'}
      </span>
    </div>
  );
}

export function IncidentShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const healthCheck = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), staleTime: 30_000 } });
  const health = useGetHealth({ query: { queryKey: getGetHealthQueryKey(), staleTime: 30_000 } });
  const memory = useGetMemoryStatus({ query: { queryKey: getGetMemoryStatusQueryKey(), staleTime: 30_000 } });
  const integration = health.data ?? healthCheck.data;
  const isWorkspace = location === '/';

  const nav = [
    { href: '/', label: 'Investigation', icon: Activity },
    { href: '/history', label: 'Memory bank', icon: History },
  ];

  return (
    <div className="noise min-h-[100dvh] bg-background">
      <header className="mobile-only sticky top-0 z-40 flex h-[62px] items-center justify-between border-b border-border bg-[#252b3e] px-4 text-sidebar-foreground">
        <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5" data-testid="link-mobile-logo">
          <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#f3bb4a] text-[#252b3e]"><BrainCircuit size={18} strokeWidth={2.5} /></span>
          <span className="font-extrabold tracking-[-.04em]">Incident<span className="text-[#f3bb4a]">IQ</span></span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="grid h-9 w-9 place-items-center rounded-lg border border-sidebar-border text-sidebar-foreground" aria-label="Toggle navigation" data-testid="button-toggle-navigation">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {mobileOpen && (
        <div className="mobile-only fixed inset-x-0 top-[62px] z-30 border-b border-sidebar-border bg-[#252b3e] p-3 shadow-lg">
          <nav className="space-y-1">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${location === href ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-foreground/70'}`} key={href} data-testid={`link-mobile-${label.toLowerCase().replace(' ', '-')}`}>
                <Icon size={17} /><span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}

      <aside className="desktop-only fixed inset-y-0 left-0 z-20 flex w-[238px] flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex h-[78px] items-center border-b border-sidebar-border px-6">
          <Link href="/" className="flex items-center gap-3" data-testid="link-logo">
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#f3bb4a] text-[#252b3e]"><BrainCircuit size={20} strokeWidth={2.4} /></span>
            <div>
              <div className="text-[16px] font-extrabold tracking-[-.045em]">Incident<span className="text-[#f3bb4a]">IQ</span></div>
              <div className="mono mt-0.5 text-[9px] uppercase tracking-[.18em] text-sidebar-foreground/45">operations memory</div>
            </div>
          </Link>
        </div>
        <div className="flex-1 px-3 py-6">
          <div className="eyebrow mb-3 px-3 text-sidebar-foreground/40">Workspace</div>
          <nav className="space-y-1">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link href={href} className={`group flex items-center justify-between rounded-lg px-3 py-3 text-[13px] transition-colors ${location === href ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-foreground/62 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`} key={href} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`}>
                <span className="flex items-center gap-3"><Icon size={17} strokeWidth={1.8} /><span>{label}</span></span>
                {location === href && <ChevronRight size={14} className="text-[#f3bb4a]" />}
              </Link>
            ))}
          </nav>
          <div className="mt-9">
            <div className="eyebrow mb-3 px-3 text-sidebar-foreground/40">System</div>
            <div className="space-y-1">
              <ConfigStatus label="API health" ready={integration?.status === 'ok' || integration?.status === 'healthy'} loading={health.isLoading && healthCheck.isLoading} />
              <ConfigStatus label="Hindsight memory" ready={memory.data?.configured === true && integration?.hindsightConfigured === true} loading={memory.isLoading} />
              <ConfigStatus label="Groq reasoning" ready={integration?.llmConfigured === true} loading={health.isLoading && healthCheck.isLoading} />
            </div>
          </div>
        </div>
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/45 p-3.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold"><ShieldCheck size={14} className="text-[#b9de72]" /> Evidence-first mode</div>
            <p className="mt-2 text-[11px] leading-relaxed text-sidebar-foreground/50">Every recommendation carries its memory trail.</p>
          </div>
          <div className="mt-4 flex items-center justify-between px-1 text-[10px] text-sidebar-foreground/35">
            <span className="mono">v0.8.4 / local</span>
            <CircleHelp size={14} />
          </div>
        </div>
      </aside>

      <main className="min-h-[100dvh] md:pl-[238px]">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-6 md:px-10 md:py-8 lg:px-12">
          <div className="mb-6 hidden items-center justify-between text-[11px] text-muted-foreground md:flex">
            <div className="flex items-center gap-2"><span className="mono uppercase tracking-[.12em]">Ops room</span><ChevronRight size={13} /><span>{isWorkspace ? 'Live investigation' : 'Memory bank'}</span></div>
            <div className="flex items-center gap-5"><span className="flex items-center gap-2"><Network size={13} /> region: us-east-1</span><span className="flex items-center gap-2"><Server size={13} /> {integration?.memoryBankId || memory.data?.bankId || 'bank pending'}</span></div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}