export function fetchSimulations() {
  return fetch('/api/simulations').then(res => res.json());
}
