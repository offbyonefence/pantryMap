// Pure search/filter/sort logic — no DOM, no network. Unit tested in tests/.

const EARTH_RADIUS_MILES = 3958.8;

// Escapes for BOTH element and attribute context (quotes included) — card
// markup interpolates data into href="..." attributes, so &quot;/&#39; matter.
const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export function haversineMiles(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(a));
}

export function isValidZip(text) {
  return /^\d{5}$/.test(text.trim());
}

// zips: { "75201": [lat, lng], ... } → {lat, lng} or null
export function lookupZip(zips, zip) {
  const hit = zips[zip.trim()];
  return hit ? { lat: hit[0], lng: hit[1] } : null;
}

// Annotates each food bank with .distance (miles) and returns a new
// nearest-first array. origin: {lat, lng}.
export function rankByDistance(foodbanks, origin) {
  return foodbanks
    .map((fb) => ({ ...fb, distance: haversineMiles(origin.lat, origin.lng, fb.lat, fb.lng) }))
    .sort((a, b) => a.distance - b.distance);
}

const DEFAULT_TIMEZONE = "America/Chicago"; // current listings are all Texas

// now: a Date. Evaluated in the FOOD BANK's timezone (entry `timezone` field,
// IANA name), so a visitor checking from another timezone still sees the truth.
export function isOpenNow(foodbank, now = new Date()) {
  if (!foodbank.hours || foodbank.hours.length === 0) return null; // unknown
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: foodbank.timezone ?? DEFAULT_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  const day = get("weekday").toLowerCase().slice(0, 3);
  const hhmm = `${get("hour")}:${get("minute")}`;
  return foodbank.hours.some((h) => h.day === day && h.open <= hhmm && hhmm < h.close);
}

// filters: {openNow, noIdRequired, noAppointment, service, query}
export function applyFilters(foodbanks, filters, now = new Date()) {
  let out = foodbanks;
  if (filters.openNow) out = out.filter((fb) => isOpenNow(fb, now) === true);
  if (filters.noIdRequired) out = out.filter((fb) => fb.idRequired === false);
  if (filters.noAppointment) out = out.filter((fb) => fb.appointmentRequired === false);
  if (filters.service) out = out.filter((fb) => fb.services.includes(filters.service));
  if (filters.query) {
    const q = filters.query.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (fb) =>
          fb.name.toLowerCase().includes(q) ||
          fb.address.city.toLowerCase().includes(q) ||
          fb.address.zip.startsWith(q)
      );
    }
  }
  return out;
}

export function formatDistance(miles) {
  if (miles < 0.1) return "under 0.1 mi";
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
}

const DAY_LABELS = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

export function formatTime(hhmm) {
  let [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return m === 0 ? `${h}${suffix}` : `${h}:${String(m).padStart(2, "0")}${suffix}`;
}

// Groups consecutive-day entries with identical times: "Mon–Fri 9am–1pm".
export function formatHours(hours) {
  if (!hours || hours.length === 0) return [];
  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const sorted = [...hours].sort(
    (a, b) => order.indexOf(a.day) - order.indexOf(b.day) || a.open.localeCompare(b.open)
  );
  const lines = [];
  for (const h of sorted) {
    const time = `${formatTime(h.open)}–${formatTime(h.close)}`;
    const prev = lines[lines.length - 1];
    if (prev && prev.time === time && order.indexOf(h.day) === order.indexOf(prev.lastDay) + 1) {
      prev.lastDay = h.day;
    } else {
      lines.push({ firstDay: h.day, lastDay: h.day, time });
    }
  }
  return lines.map((l) =>
    l.firstDay === l.lastDay
      ? `${DAY_LABELS[l.firstDay]} ${l.time}`
      : `${DAY_LABELS[l.firstDay]}–${DAY_LABELS[l.lastDay]} ${l.time}`
  );
}
