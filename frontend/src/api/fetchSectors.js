export function fetchSectors() {
  return fetch('/api/sectors').then(res => res.json());
}
