import Plot from 'react-plotly.js';
function CostDistributionChart({ data }) {
  return <Plot data={data} layout={{ title: 'Cost Chart' }} />;
}
export default CostDistributionChart;
