"use strict";

/**
 * Extracts the best primary title and alternative title from a manga attributes object.
 * Avoids falling back to 'Sem título' for manhwas (ko-ro), manhuas (zh-ro), or titles
 * where English/Portuguese exists in altTitles but not in the main title map.
 */
function extractMangaTitles(attrs = {}) {
  const titleMap = attrs.title || {};
  const altList = Array.isArray(attrs.altTitles) ? attrs.altTitles : [];

  const findInMap = (map, langs) => {
    for (const lang of langs) {
      const val = map[lang];
      if (typeof val === "string" && val.trim()) {
        return { value: val.trim(), lang };
      }
    }
    return null;
  };

  const findInAlt = (langs) => {
    for (const lang of langs) {
      for (const item of altList) {
        if (!item || typeof item !== "object") continue;
        const val = item[lang];
        if (typeof val === "string" && val.trim()) {
          return { value: val.trim(), lang };
        }
      }
    }
    return null;
  };

  // 1. Primary Title Resolution
  // Preferred priority:
  // 1.1 Portuguese (pt-br, pt)
  // 1.2 English (en)
  // 1.3 Romanized titles (ja-ro, ko-ro, zh-ro)
  // 1.4 Native / other keys in titleMap
  // 1.5 Any key in altList
  let primary =
    findInMap(titleMap, ["pt-br", "pt"]) ||
    findInAlt(["pt-br", "pt"]) ||
    findInMap(titleMap, ["en"]) ||
    findInAlt(["en"]) ||
    findInMap(titleMap, ["ja-ro", "ko-ro", "zh-ro"]) ||
    findInAlt(["ja-ro", "ko-ro", "zh-ro"]);

  if (!primary) {
    const firstTitleEntry = Object.entries(titleMap).find(
      ([_, v]) => typeof v === "string" && v.trim(),
    );
    if (firstTitleEntry) {
      primary = { value: firstTitleEntry[1].trim(), lang: firstTitleEntry[0] };
    }
  }

  if (!primary) {
    for (const item of altList) {
      if (!item || typeof item !== "object") continue;
      const entry = Object.entries(item).find(([_, v]) => typeof v === "string" && v.trim());
      if (entry) {
        primary = { value: entry[1].trim(), lang: entry[0] };
        break;
      }
    }
  }

  const title = primary ? primary.value : "Sem título";
  const titleLanguage = primary ? primary.lang : null;

  // 2. Alternative Title Resolution (distinct from primary title)
  let secondary = null;

  // If primary is not English, look for English
  if (primary?.lang !== "en") {
    secondary = findInMap(titleMap, ["en"]) || findInAlt(["en"]);
  }

  // If still none or identical, look for Romanized or native
  if (!secondary || secondary.value.toLowerCase() === title.toLowerCase()) {
    secondary =
      findInMap(titleMap, ["ja-ro", "ko-ro", "zh-ro", "ja", "ko", "zh"]) ||
      findInAlt(["ja-ro", "ko-ro", "zh-ro", "ja", "ko", "zh"]);
  }

  // If still none or identical, pick any alternative that differs from title
  if (!secondary || secondary.value.toLowerCase() === title.toLowerCase()) {
    for (const item of altList) {
      if (!item || typeof item !== "object") continue;
      const entry = Object.entries(item).find(
        ([_, v]) =>
          typeof v === "string" && v.trim() && v.trim().toLowerCase() !== title.toLowerCase(),
      );
      if (entry) {
        secondary = { value: entry[1].trim(), lang: entry[0] };
        break;
      }
    }
  }

  const alternativeTitle =
    secondary && secondary.value.toLowerCase() !== title.toLowerCase() ? secondary.value : null;

  return { title, titleLanguage, alternativeTitle };
}

module.exports = { extractMangaTitles };
