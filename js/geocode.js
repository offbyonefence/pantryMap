// Location helpers. Geolocation stays on-device; Nominatim is the only
// external service, called solely when the visitor submits an address search.

export function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Your browser doesn't support location."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location permission was declined — you can search by ZIP code instead."
            : "Couldn't determine your location — try a ZIP code instead.";
        reject(new Error(msg));
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  });
}

// Sends the typed address to OpenStreetMap's Nominatim service (disclosed in
// the UI next to the search box). Rate limit: this is only called on explicit
// submit, never per keystroke.
export async function geocodeAddress(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("limit", "1");
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Address lookup failed — try a ZIP code instead.");
  const results = await res.json();
  if (!results.length) throw new Error("No match for that address — try adding a city or ZIP.");
  const r = results[0];
  return { lat: Number(r.lat), lng: Number(r.lon), label: r.display_name };
}
