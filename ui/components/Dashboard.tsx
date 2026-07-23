// ui/components/Dashboard.tsx
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { DashboardStats } from '../../storage/statsRepository';

interface DashboardProps {
  stats: DashboardStats | null;
  loading: boolean;
  onRefresh: () => void;
}

export function Dashboard({ stats, loading, onRefresh }: DashboardProps) {
  if (loading) {
    return <div style={s.center}><Skeleton /><Skeleton /><Skeleton /></div>;
  }

  if (!stats || stats.totalPages === 0) {
    return (
      <div style={s.center}>
        <span style={s.emptyIcon}>◫</span>
        <p style={s.emptyTitle}>Aucune donnée</p>
        <p style={s.emptyHint}>Navigue quelques minutes pour alimenter le dashboard.</p>
      </div>
    );
  }

  return (
    <div style={s.scroll}>
      {/* ── Chiffres clés ─────────────────────────────── */}
      <div style={s.statRow}>
        <StatCell value={stats.totalPages}   label="pages capturées" />
        <StatCell value={stats.indexedPages} label="indexées" accent />
        <StatCell value={stats.totalSites}   label="sites" />
      </div>

      <Divider />

      {/* ── Activité ──────────────────────────────────── */}
      {stats.pagesPerDay.length >= 2 && (
        <Section title="Activité (14 jours)">
          <ResponsiveContainer width="100%" height={90}>
            <AreaChart data={stats.pagesPerDay} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7C6AF7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7C6AF7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                tick={{ fill: '#484F58', fontSize: 9 }}
                interval="preserveStartEnd"
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#484F58', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 4, fontSize: 11 }}
                labelFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                labelStyle={{ color: '#8B949E' }}
                itemStyle={{ color: '#7C6AF7' }}
                formatter={(v: number) => [v, 'pages']}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#7C6AF7"
                strokeWidth={1.5}
                fill="url(#actGrad)"
                dot={false}
                activeDot={{ r: 3, fill: '#7C6AF7' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* ── Top sites ─────────────────────────────────── */}
      {stats.topDomains.length > 0 && (
        <Section title="Sites les plus visités">
          <ResponsiveContainer width="100%" height={stats.topDomains.length * 22 + 8}>
            <BarChart
              data={stats.topDomains}
              layout="vertical"
              margin={{ top: 0, right: 4, bottom: 0, left: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="domain"
                width={110}
                tick={{ fill: '#8B949E', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 4, fontSize: 11 }}
                cursor={{ fill: 'rgba(124,106,247,0.06)' }}
                formatter={(v: number) => [v, 'pages']}
              />
              <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={12}>
                {stats.topDomains.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#7C6AF7' : '#21262D'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* ── Clusters ──────────────────────────────────── */}
      {stats.clusterDistribution.length > 0 && (
        <Section title="Sujets">
          <div style={s.clusters}>
            {stats.clusterDistribution.map((c) => (
              <ClusterBar
                key={c.clusterId}
                color={c.color}
                count={c.count}
                total={stats.totalPages}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Refresh */}
      <div style={s.refreshRow}>
        <button style={s.refreshBtn} onClick={onRefresh}>↺ Actualiser</button>
      </div>
    </div>
  );
}

// ── Sous-composants ────────────────────────────────────────────────────────

function StatCell({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div style={s.statCell}>
      <span style={{ ...s.statValue, color: accent ? 'var(--accent)' : 'var(--text-primary)' }}>
        {value.toLocaleString('fr-FR')}
      </span>
      <span style={s.statLabel}>{label}</span>
    </div>
  );
}

function ClusterBar({ color, count, total }: { color: string; count: number; total: number }) {
  const pct = Math.max(4, Math.round((count / total) * 100));
  return (
    <div style={s.clusterRow}>
      <div style={{ ...s.clusterDot, background: color }} />
      <div style={s.clusterTrack}>
        <div style={{ ...s.clusterFill, background: color, width: `${pct}%` }} />
      </div>
      <span style={s.clusterCount}>{count}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={s.section}>
      <p style={s.sectionTitle}>{title}</p>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--border)', margin: '0 14px' }} />;
}

function Skeleton() {
  return <div style={s.skeleton} />;
}

const s: Record<string, React.CSSProperties> = {
  scroll: { overflowY: 'auto', flex: 1 },
  center: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100%', padding: 32, textAlign: 'center',
  },
  emptyIcon: { fontSize: 28, opacity: 0.2, marginBottom: 10 },
  emptyTitle: { fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 },
  emptyHint: { fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 },
  statRow: {
    display: 'flex', gap: 0,
    padding: '14px 14px 12px',
  },
  statCell: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: 2,
    borderRight: '1px solid var(--border)',
    padding: '0 12px',
  },
  statValue: { fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-mono)', lineHeight: 1 },
  statLabel: { fontSize: 10, color: 'var(--text-muted)', marginTop: 2 },
  section: { padding: '12px 14px' },
  sectionTitle: { fontSize: 10, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.04em' },
  clusters: { display: 'flex', flexDirection: 'column', gap: 6 },
  clusterRow: { display: 'flex', alignItems: 'center', gap: 8 },
  clusterDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  clusterTrack: {
    flex: 1, height: 4, background: 'var(--bg-surface)',
    borderRadius: 2, overflow: 'hidden',
  },
  clusterFill: { height: '100%', borderRadius: 2, transition: 'width 0.4s ease' },
  clusterCount: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', width: 24, textAlign: 'right' },
  refreshRow: { display: 'flex', justifyContent: 'center', padding: '8px 14px 16px' },
  refreshBtn: {
    background: 'none', border: '1px solid var(--border)',
    color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
    padding: '4px 12px', borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-ui)',
  },
  skeleton: {
    height: 60, background: 'var(--bg-surface)',
    borderRadius: 'var(--radius-sm)', margin: '8px 14px',
    animation: 'pulse 1.5s ease infinite',
  },
};