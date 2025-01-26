export function fetchRecommendations() {
  return fetch('/api/recommendations').then(res => res.json());
}
