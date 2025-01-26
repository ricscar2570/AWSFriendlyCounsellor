export function formatChartData(data) {
  return { x: data.map(d => d.name), y: data.map(d => d.cost) };
}
