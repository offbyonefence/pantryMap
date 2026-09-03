import { describe, expect, test } from "bun:test";
import {
  applyFilters,
  escapeHtml,
  formatDistance,
  formatHours,
  formatTime,
  haversineMiles,
  isOpenNow,
  isValidZip,
  lookupZip,
  rankByDistance,
} from "../js/search.js";

const fb = (over = {}) => ({
  id: "tx-dallas-test",
  name: "Test Pantry",
  address: { street: "1 Main St", city: "Dallas", state: "TX", zip: "75201" },
  lat: 32.78,
  lng: -96.8,
  services: ["food-pantry"],
  hours: [{ day: "mon", open: "09:00", close: "13:00" }],
  ...over,
});

describe("haversineMiles", () => {
  test("zero distance for identical points", () => {
    expect(haversineMiles(32.78, -96.8, 32.78, -96.8)).toBe(0);
  });
  test("Dallas to Fort Worth is roughly 31 miles", () => {
    const d = haversineMiles(32.7767, -96.797, 32.7555, -97.3308);
    expect(d).toBeGreaterThan(28);
    expect(d).toBeLessThan(34);
  });
});

describe("isValidZip / lookupZip", () => {
  test("accepts 5 digits, rejects everything else", () => {
    expect(isValidZip("75201")).toBe(true);
    expect(isValidZip(" 75201 ")).toBe(true);
    expect(isValidZip("7520")).toBe(false);
    expect(isValidZip("75201-1234")).toBe(false);
    expect(isValidZip("dallas")).toBe(false);
  });
  test("lookupZip resolves known ZIPs and rejects unknown", () => {
    const zips = { "75201": [32.7887, -96.7676] };
    expect(lookupZip(zips, "75201")).toEqual({ lat: 32.7887, lng: -96.7676 });
    expect(lookupZip(zips, "00000")).toBeNull();
  });
});

describe("rankByDistance", () => {
  test("sorts nearest first and annotates distance", () => {
    const far = fb({ id: "far", lat: 33.5, lng: -97.5 });
    const near = fb({ id: "near", lat: 32.79, lng: -96.81 });
    const ranked = rankByDistance([far, near], { lat: 32.78, lng: -96.8 });
    expect(ranked.map((f) => f.id)).toEqual(["near", "far"]);
    expect(ranked[0].distance).toBeLessThan(ranked[1].distance);
  });
});

describe("isOpenNow", () => {
  // Explicit -05:00 offsets: these are Central Daylight Time instants, so the
  // tests pass identically on any runner timezone (CI runs UTC).
  const monNoonCT = new Date("2026-08-31T12:00:00-05:00"); // a Monday
  const monEveningCT = new Date("2026-08-31T18:00:00-05:00");
  test("open during posted hours, closed after (evaluated in the listing's timezone)", () => {
    expect(isOpenNow(fb(), monNoonCT)).toBe(true);
    expect(isOpenNow(fb(), monEveningCT)).toBe(false);
  });
  test("null (unknown) when no hours are listed", () => {
    expect(isOpenNow(fb({ hours: [] }), monNoonCT)).toBeNull();
  });
  test("close time is exclusive", () => {
    const at1pmCT = new Date("2026-08-31T13:00:00-05:00");
    expect(isOpenNow(fb(), at1pmCT)).toBe(false);
  });
  test("respects a non-default timezone on the entry", () => {
    // Noon CT = 1pm ET; a New-York-timezone pantry closing at 13:00 is closed.
    expect(isOpenNow(fb({ timezone: "America/New_York" }), monNoonCT)).toBe(false);
    expect(isOpenNow(fb({ timezone: "America/Chicago" }), monNoonCT)).toBe(true);
  });
});

describe("escapeHtml", () => {
  test("escapes element-context characters", () => {
    expect(escapeHtml("<b>&</b>")).toBe("&lt;b&gt;&amp;&lt;/b&gt;");
  });
  test("escapes quotes so attribute context cannot be broken out of", () => {
    expect(escapeHtml('https://x.com/" onfocus="alert(1)')).toBe(
      "https://x.com/&quot; onfocus=&quot;alert(1)"
    );
    expect(escapeHtml("O'Brien's Pantry")).toBe("O&#39;Brien&#39;s Pantry");
  });
  test("null/undefined become empty string", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("applyFilters", () => {
  const banks = [
    fb({ id: "a", name: "Alpha", idRequired: false, appointmentRequired: false }),
    fb({ id: "b", name: "Beta", idRequired: true, services: ["hot-meals"], hours: [] }),
  ];
  test("openNow keeps only banks verifiably open", () => {
    const out = applyFilters(banks, { openNow: true }, new Date("2026-08-31T12:00:00-05:00"));
    expect(out.map((f) => f.id)).toEqual(["a"]);
  });
  test("noIdRequired excludes unknown (null) and true", () => {
    const out = applyFilters(banks, { noIdRequired: true });
    expect(out.map((f) => f.id)).toEqual(["a"]);
  });
  test("service filter matches the services array", () => {
    const out = applyFilters(banks, { service: "hot-meals" });
    expect(out.map((f) => f.id)).toEqual(["b"]);
  });
  test("query matches name or city, case-insensitive", () => {
    expect(applyFilters(banks, { query: "beta" }).map((f) => f.id)).toEqual(["b"]);
    expect(applyFilters(banks, { query: "DALLAS" })).toHaveLength(2);
    expect(applyFilters(banks, { query: "752" })).toHaveLength(2);
  });
});

describe("formatting", () => {
  test("formatDistance", () => {
    expect(formatDistance(0.05)).toBe("under 0.1 mi");
    expect(formatDistance(2.34)).toBe("2.3 mi");
    expect(formatDistance(15.7)).toBe("16 mi");
  });
  test("formatTime", () => {
    expect(formatTime("09:00")).toBe("9am");
    expect(formatTime("13:30")).toBe("1:30pm");
    expect(formatTime("00:15")).toBe("12:15am");
    expect(formatTime("12:00")).toBe("12pm");
  });
  test("formatHours groups consecutive identical days", () => {
    const hours = [
      { day: "mon", open: "09:00", close: "13:00" },
      { day: "tue", open: "09:00", close: "13:00" },
      { day: "wed", open: "09:00", close: "13:00" },
      { day: "sat", open: "10:00", close: "12:00" },
    ];
    expect(formatHours(hours)).toEqual(["Mon–Wed 9am–1pm", "Sat 10am–12pm"]);
  });
  test("formatHours handles split shifts on one day", () => {
    const hours = [
      { day: "mon", open: "09:00", close: "11:30" },
      { day: "mon", open: "13:30", close: "16:00" },
    ];
    expect(formatHours(hours)).toEqual(["Mon 9am–11:30am", "Mon 1:30pm–4pm"]);
  });
  test("formatHours empty input", () => {
    expect(formatHours([])).toEqual([]);
    expect(formatHours(undefined)).toEqual([]);
  });
});
