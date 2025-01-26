function SimulateRegionSelector({ onSelect }) {
  return <select onChange={(e) => onSelect(e.target.value)}>
    <option value="us-east-1">US East</option>
    <option value="eu-west-1">EU West</option>
  </select>;
}
export default SimulateRegionSelector;
