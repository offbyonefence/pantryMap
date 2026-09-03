import {
  applyFilters,
  escapeHtml as esc,
  formatDistance,
  formatHours,
  isOpenNow,
  isValidZip,
  lookupZip,
  rankByDistance,
} from "./search.js";
import { geocodeAddress, getBrowserLocation } from "./geocode.js";
import { showMap } from "./map.js";

const SERVICE_LABELS = {
  "food-pantry": "Food pantry",
  "hot-meals": "Hot meals",
  "mobile-pantry": "Mobile pantry",
  groceries: "Groceries",
  "snap-assistance": "SNAP help",
  "senior-boxes": "Senior boxes",
  "kids-meals": "Kids' meals",
  clothing: "Clothing",
  other: "Other",
};

const state = {
  foodbanks: [],
  origin: null, // {lat, lng}
  originLabel: "",
  zips: null, // lazy-loaded ZIP centroid table
  filters: { openNow: false, noIdRequired: false, noAppointment: false, service: "", query: "" },
  mapOpen: false,
  animateNext: false, // play the card entrance animation on the next render only
};

const $ = (sel) => document.querySelector(sel);

function showResults() {
  state.animateNext = true;
  $("#landing").hidden = true;
  $("#results-view").hidden = false;
  window.scrollTo(0, 0);
}

function showLanding() {
  $("#results-view").hidden = true;
  $("#landing").hidden = false;
  window.scrollTo(0, 0);
  $("#search-input").focus();
}

// Mirrors the message into both views so it is visible whichever one is shown.
function setStatus(msg, isError = false) {
  for (const el of [$("#status"), $("#results-status")]) {
    el.textContent = msg;
    el.classList.toggle("error", isError);
  }
}

async function loadZips() {
  if (!state.zips) {
    setStatus("Loading ZIP code data…");
    const res = await fetch("data/zips.json");
    state.zips = await res.json();
  }
  return state.zips;
}

function currentResults() {
  const base = state.origin ? rankByDistance(state.foodbanks, state.origin) : [...state.foodbanks];
  if (!state.origin) {
    base.sort((a, b) => a.address.city.localeCompare(b.address.city) || a.name.localeCompare(b.name));
  }
  return applyFilters(base, state.filters);
}

function card(fb, animate) {
  const open = isOpenNow(fb);
  const hoursLines = formatHours(fb.hours);
  const dirOsm = `https://www.openstreetmap.org/directions?to=${fb.lat}%2C${fb.lng}`;
  const dirGoogle = `https://www.google.com/maps/dir/?api=1&destination=${fb.lat}%2C${fb.lng}`;
  const dirApple = `https://maps.apple.com/?daddr=${fb.lat}%2C${fb.lng}`;
  const badges =
    (fb.referralHub ? '<span class="badge hub">Referral hub — not a walk-up pantry</span>' : "") +
    fb.services.map((s) => `<span class="badge">${esc(SERVICE_LABELS[s] ?? s)}</span>`).join("");

  return `
  <li class="card${animate ? " card-enter" : ""}">
    <div class="card-head">
      <h3>${esc(fb.name)}</h3>
      ${fb.distance !== undefined ? `<span class="distance">${formatDistance(fb.distance)}</span>` : ""}
    </div>
    <p class="addr">${esc(fb.address.street)}${fb.address.street2 ? ", " + esc(fb.address.street2) : ""}, ${esc(fb.address.city)}, ${esc(fb.address.state)} ${esc(fb.address.zip)}</p>
    <p class="badges">${badges}${open === true ? '<span class="badge open">Open now</span>' : ""}</p>
    ${hoursLines.length ? `<p class="hours">${hoursLines.map(esc).join(" · ")}</p>` : ""}
    ${fb.hoursNotes ? `<p class="hours-notes">${esc(fb.hoursNotes)}</p>` : ""}
    ${fb.requirements ? `<p class="reqs"><strong>To visit:</strong> ${esc(fb.requirements)}</p>` : ""}
    <p class="links">
      ${fb.phone ? `<a href="tel:${esc(fb.phone.replace(/[^0-9]/g, ""))}">${esc(fb.phone)}</a>` : ""}
      ${fb.website ? `<a href="${esc(fb.website)}" rel="noopener">Website</a>` : ""}
      <span class="directions">Directions:
        <a href="${dirOsm}" rel="noopener">OSM</a>
        <a href="${dirGoogle}" rel="noopener">Google</a>
        <a href="${dirApple}" rel="noopener">Apple</a>
      </span>
    </p>
    ${fb.lastVerified ? `<p class="verified">Details last verified ${esc(fb.lastVerified)}</p>` : ""}
  </li>`;
}

function render() {
  const results = currentResults();
  const animate = state.animateNext;
  state.animateNext = false;
  $("#results").innerHTML = results.map((fb) => card(fb, animate)).join("");

  const n = results.length;
  const where = state.originLabel ? ` near ${state.originLabel}` : "";
  $(".eyebrow").textContent = state.origin ? "Food banks near you" : "All food banks";
  $("#result-summary").textContent = n
    ? `${n} food bank${n === 1 ? "" : "s"}${where}${state.origin ? ", closest first" : ", A–Z by city"}`
    : `No food banks match${where}. Try removing a filter or widening your search.`;

  if (state.mapOpen) {
    showMap($("#map"), results, state.origin).catch((e) => setStatus(e.message, true));
  }
}

async function handleSearch(text) {
  const q = text.trim();
  if (!q) return;
  try {
    if (isValidZip(q)) {
      const zips = await loadZips();
      const hit = lookupZip(zips, q);
      if (!hit) {
        setStatus(`ZIP code ${q} wasn't found — double-check the digits.`, true);
        return;
      }
      state.origin = hit;
      state.originLabel = `ZIP ${q}`;
      setStatus("");
    } else {
      setStatus("Looking up that address via OpenStreetMap…");
      const r = await geocodeAddress(q);
      state.origin = { lat: r.lat, lng: r.lng };
      state.originLabel = r.label.split(",").slice(0, 2).join(",");
      setStatus("");
    }
    showResults();
    render();
  } catch (e) {
    setStatus(e.message, true);
  }
}

async function init() {
  try {
    const res = await fetch("data/foodbanks.json");
    const data = await res.json();
    state.foodbanks = data.foodbanks;
  } catch {
    setStatus("Couldn't load the food bank list. Please refresh the page.", true);
    return;
  }

  $("#search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    handleSearch($("#search-input").value);
  });

  $("#use-location").addEventListener("click", async () => {
    setStatus("Asking your browser for your location…");
    try {
      state.origin = await getBrowserLocation();
      state.originLabel = "your location";
      setStatus("");
      showResults();
      render();
    } catch (e) {
      setStatus(e.message, true);
    }
  });

  $("#browse-all").addEventListener("click", () => {
    state.origin = null;
    state.originLabel = "";
    setStatus("");
    showResults();
    render();
  });

  for (const id of ["#new-search", "#back-home"]) {
    $(id).addEventListener("click", showLanding);
  }

  $("#filter-name").addEventListener("input", (e) => {
    state.filters.query = e.target.value;
    render();
  });
  for (const [id, key] of [
    ["filter-open", "openNow"],
    ["filter-no-id", "noIdRequired"],
    ["filter-no-appt", "noAppointment"],
  ]) {
    $(`#${id}`).addEventListener("change", (e) => {
      state.filters[key] = e.target.checked;
      render();
    });
  }
  $("#filter-service").addEventListener("change", (e) => {
    state.filters.service = e.target.value;
    render();
  });

  $("#map-toggle").addEventListener("click", () => {
    state.mapOpen = !state.mapOpen;
    $("#map-wrap").hidden = !state.mapOpen;
    $("#map-toggle").setAttribute("aria-expanded", String(state.mapOpen));
    $("#map-toggle").textContent = state.mapOpen ? "Hide map" : "Show map";
    if (state.mapOpen) render();
  });

  render();
}

init();
