// ui/styles/clusterColors.ts
export const CLUSTER_COLORS = [
  '#7C6AF7','#3FB950','#58A6FF','#E3A952','#F778A1',
  '#56D364','#BC8CFF','#79C0FF','#FF7B72','#D2A8FF',
  '#A5D6FF','#7EE787','#FFA657','#FFD68A','#FFA198',
];

export function clusterColor(clusterId: number | null): string {
  if (clusterId === null) return '#484F58';
  return CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
}