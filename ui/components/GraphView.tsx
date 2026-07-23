// ui/components/GraphView.tsx
import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import type { SerializedGraph } from '../../core/graph/buildGraph';

// Palette de clusters — distincte, ni terracotta ni acid-green
const CLUSTER_COLORS = [
  '#7C6AF7', // violet (accent)
  '#3FB950', // vert
  '#58A6FF', // bleu
  '#E3A952', // ambre
  '#F778A1', // rose
  '#56D364', // vert clair
  '#BC8CFF', // violet clair
  '#79C0FF', // bleu clair
  '#FF7B72', // corail
  '#D2A8FF', // lavande
  '#A5D6FF', // cyan
  '#7EE787', // menthe
  '#FFA657', // orange
  '#FFD68A', // jaune
  '#FFA198', // saumon
];

interface SelectedNode {
  label: string;
  url: string;
  cluster: number;
  degree: number;
}

interface GraphViewProps {
  data: SerializedGraph | null;
  loading: boolean;
  onBuild: () => void;
}

export function GraphView({ data, loading, onBuild }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [selected, setSelected] = useState<SelectedNode | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data || data.nodes.length === 0) return;
    if (cyRef.current) cyRef.current.destroy();

    const maxDegree = Math.max(...data.nodes.map((n) => n.degree), 1);

    const cy = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: data.nodes.map((n) => ({
          data: { id: n.id, label: n.label, url: n.url, cluster: n.cluster, degree: n.degree },
        })),
        edges: data.edges.map((e) => ({
          data: { source: e.source, target: e.target, weight: e.weight },
        })),
      },
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (el: cytoscape.NodeSingular) =>
              CLUSTER_COLORS[el.data('cluster') % CLUSTER_COLORS.length],
            'width': (el: cytoscape.NodeSingular) =>
              10 + (el.data('degree') / maxDegree) * 14,
            'height': (el: cytoscape.NodeSingular) =>
              10 + (el.data('degree') / maxDegree) * 14,
            'label': 'data(label)',
            'font-size': '7px',
            'color': '#8B949E',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 5,
            'text-max-width': '70px',
            'text-wrap': 'ellipsis',
            'border-width': 0,
            'opacity': 0.9,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 2,
            'border-color': '#FFFFFF',
            'opacity': 1,
            'color': '#E6EDF3',
          },
        },
        {
          selector: 'node.faded',
          style: { 'opacity': 0.15 },
        },
        {
          selector: 'edge',
          style: {
            'width': (el: cytoscape.EdgeSingular) =>
              Math.max(0.5, (el.data('weight') - SIMILARITY_DISPLAY_MIN) * 4),
            'line-color': '#21262D',
            'opacity': 0.5,
            'curve-style': 'bezier',
          },
        },
        {
          selector: 'edge.highlighted',
          style: {
            'line-color': '#7C6AF7',
            'opacity': 0.8,
          },
        },
      ],
      layout: {
        name: 'cose',
        idealEdgeLength: 90,
        nodeRepulsion: () => 10000,
        gravity: 0.2,
        numIter: 1000,
        animate: false, // pas d'animation auto — performance + sobriété
      } as cytoscape.LayoutOptions,
      minZoom: 0.2,
      maxZoom: 4,
    });

    // Highlight des voisins au clic
    cy.on('tap', 'node', (evt) => {
      const node = evt.target as cytoscape.NodeSingular;
      const neighbors = node.neighborhood();

      cy.elements().addClass('faded');
      node.removeClass('faded');
      neighbors.removeClass('faded');
      neighbors.filter('edge').addClass('highlighted');

      setSelected({
        label: node.data('label'),
        url: node.data('url'),
        cluster: node.data('cluster'),
        degree: node.data('degree'),
      });
    });

    // Reset au clic sur le fond
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.elements().removeClass('faded highlighted');
        setSelected(null);
      }
    });

    cyRef.current = cy;
    return () => { cy.destroy(); cyRef.current = null; };
  }, [data]);

  // ── États vides ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.center}>
        <LoadingDots />
        <p style={styles.hint}>Calcul des clusters et des connexions…</p>
        <p style={styles.subhint}>Peut prendre 5 à 15 secondes</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.center}>
        <div style={styles.emptyIcon}>⬡</div>
        <p style={styles.emptyTitle}>Graphe de connaissances</p>
        <p style={styles.emptyHint}>
          Relie automatiquement tes pages par similarité de contenu
        </p>
        <button style={styles.buildBtn} onClick={onBuild}>
          Construire le graphe
        </button>
      </div>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <div style={styles.center}>
        <p style={styles.emptyTitle}>Pas assez de pages indexées</p>
        <p style={styles.emptyHint}>Navigue quelques minutes, puis reviens.</p>
      </div>
    );
  }

  // ── Graphe ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.wrapper}>
      <div ref={containerRef} style={styles.canvas} />

      {/* Tooltip noeud sélectionné */}
      {selected && (
        <div style={styles.tooltip}>
          <div
            style={{ ...styles.tooltipDot, background: CLUSTER_COLORS[selected.cluster % CLUSTER_COLORS.length] }}
          />
          <div style={styles.tooltipBody}>
            <p style={styles.tooltipTitle}>{selected.label}</p>
            <a href={selected.url} target="_blank" rel="noreferrer" style={styles.tooltipUrl}>
              {new URL(selected.url).hostname}
            </a>
            <p style={styles.tooltipMeta}>{selected.degree} connexion{selected.degree > 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* Légende bas */}
      <div style={styles.footer}>
        <span style={styles.stat}>{data.nodes.length} pages</span>
        <span style={styles.statDivider}>·</span>
        <span style={styles.stat}>{data.edges.length} connexions</span>
        <button style={styles.refreshBtn} onClick={onBuild} title="Recalculer">↺</button>
      </div>
    </div>
  );
}

const SIMILARITY_DISPLAY_MIN = 0.6;

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6, height: 6,
            borderRadius: '50%',
            background: 'var(--accent)',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            opacity: 0.7,
          }}
        />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:.2} 50%{opacity:1} }`}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' },
  canvas: { flex: 1, background: 'var(--bg-base)' },
  center: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100%', padding: '40px 24px', textAlign: 'center',
    color: 'var(--text-muted)',
  },
  emptyIcon: { fontSize: 32, marginBottom: 12, opacity: 0.3, lineHeight: 1 },
  emptyTitle: { fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 6 },
  emptyHint: { fontSize: 12, lineHeight: 1.6, maxWidth: 220, marginBottom: 20 },
  hint: { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 },
  subhint: { fontSize: 11, color: 'var(--text-muted)' },
  buildBtn: {
    background: 'var(--accent)', color: '#fff', border: 'none',
    borderRadius: 'var(--radius-sm)', padding: '8px 18px',
    fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 500,
  },
  tooltip: {
    position: 'absolute', bottom: 44, left: 12,
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '8px 12px',
    display: 'flex', alignItems: 'flex-start', gap: 10,
    maxWidth: 260, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  },
  tooltipDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4 },
  tooltipBody: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  tooltipTitle: {
    fontSize: 12, color: 'var(--text-primary)', fontWeight: 500,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  tooltipUrl: {
    fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
    textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  tooltipMeta: { fontSize: 10, color: 'var(--text-muted)' },
  footer: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderTop: '1px solid var(--border)',
    background: 'var(--bg-base)',
  },
  stat: { fontSize: 11, color: 'var(--text-muted)' },
  statDivider: { fontSize: 11, color: 'var(--border)' },
  refreshBtn: {
    marginLeft: 'auto', background: 'none', border: 'none',
    color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14,
    padding: '2px 6px', borderRadius: 'var(--radius-sm)',
  },
};