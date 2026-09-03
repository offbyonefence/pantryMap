// Lazy Leaflet wrapper. Leaflet's JS/CSS are vendored locally; the only
// external traffic is OSM tile images, and only after the visitor opens the map.
import { escapeHtml as esc } from "./search.js";

let leafletLoaded = false;
let map = null;
let markerLayer = null;

function loadLeaflet() {
  if (leafletLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "vendor/leaflet/leaflet.css";
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = "vendor/leaflet/leaflet.js";
    script.onload = () => {
      leafletLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Couldn't load the map."));
    document.body.appendChild(script);
  });
}

export async function showMap(container, foodbanks, origin) {
  await loadLeaflet();
  if (!map) {
    map = L.map(container, { scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
  }
  markerLayer.clearLayers();

  const points = [];
  for (const fb of foodbanks) {
    const m = L.marker([fb.lat, fb.lng]).addTo(markerLayer);
    // bindPopup interprets strings as HTML — same escaping rule as the cards.
    m.bindPopup(
      `<strong>${esc(fb.name)}</strong><br>${esc(fb.address.street)}, ${esc(fb.address.city)}` +
        (fb.distance !== undefined ? `<br>${fb.distance.toFixed(1)} mi away` : "")
    );
    points.push([fb.lat, fb.lng]);
  }
  if (origin) {
    const you = L.circleMarker([origin.lat, origin.lng], { radius: 8, color: "#1a6b45", fillOpacity: 0.9 });
    you.bindPopup("Your search location");
    you.addTo(markerLayer);
    points.push([origin.lat, origin.lng]);
  }
  if (points.length) map.fitBounds(points, { padding: [32, 32], maxZoom: 13 });
  // Leaflet needs a size refresh when its container was hidden at init time.
  setTimeout(() => map.invalidateSize(), 0);
}
