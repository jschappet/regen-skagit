/* Public maps receive only statically published story links and coordinates. */
document.addEventListener('DOMContentLoaded', () => {
  const element = document.getElementById('experiment-map');
  if (!element || !window.L) return;
  const map = L.map(element).setView([48.42, -122.33], 9);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19}).addTo(map);
  const points = [];
  document.querySelectorAll('[data-experiment-lat]').forEach(link => {
    const point = [Number(link.dataset.experimentLat), Number(link.dataset.experimentLng)];
    if (!point.every(Number.isFinite) || Math.abs(point[0]) > 90 || Math.abs(point[1]) > 180) return;
    const popup = document.createElement('a'); popup.href = link.href; popup.textContent = link.textContent;
    L.marker(point).addTo(map).bindPopup(popup); points.push(point);
  });
  if (points.length) map.fitBounds(points, {padding: [30, 30], maxZoom: 12});
});
