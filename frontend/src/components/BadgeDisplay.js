function BadgeDisplay({ badges }) {
  return <ul>{badges.map((badge, i) => <li key={i}>{badge}</li>)}</ul>;
}
export default BadgeDisplay;
