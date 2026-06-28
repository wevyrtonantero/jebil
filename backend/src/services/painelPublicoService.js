const JUNDIAI_COORDS = {
  latitude: -23.1857,
  longitude: -46.8978,
};

const weatherCodeMap = {
  0: "Ceu limpo",
  1: "Predominantemente limpo",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Neblina com geada",
  51: "Garoa fraca",
  53: "Garoa moderada",
  55: "Garoa intensa",
  56: "Garoa congelante fraca",
  57: "Garoa congelante intensa",
  61: "Chuva fraca",
  63: "Chuva moderada",
  65: "Chuva forte",
  66: "Chuva congelante fraca",
  67: "Chuva congelante forte",
  71: "Neve fraca",
  73: "Neve moderada",
  75: "Neve forte",
  77: "Granizo",
  80: "Pancadas fracas",
  81: "Pancadas moderadas",
  82: "Pancadas fortes",
  85: "Pancadas de neve fracas",
  86: "Pancadas de neve fortes",
  95: "Trovoadas",
  96: "Trovoadas com granizo fraco",
  99: "Trovoadas com granizo forte",
};

function decodeHtml(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function stripHtml(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, "").trim());
}

function extractTag(item, tagName) {
  const match = item.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? stripHtml(match[1]) : "";
}

function parseRss(xml) {
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];

  return itemMatches.slice(0, 5).map((item) => ({
    title: extractTag(item, "title"),
    link: extractTag(item, "link"),
    published_at: extractTag(item, "pubDate"),
    source: extractTag(item, "source") || "Google News",
  }));
}

async function getClimaJundiai() {
  try {
    const params = new URLSearchParams({
      latitude: String(JUNDIAI_COORDS.latitude),
      longitude: String(JUNDIAI_COORDS.longitude),
      current: "temperature_2m,weather_code",
      timezone: "America/Sao_Paulo",
      forecast_days: "1",
    });

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Weather request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const current = payload.current || {};

    return {
      city: "Jundiai",
      temperature: current.temperature_2m ?? null,
      unit: payload.current_units?.temperature_2m || "°C",
      summary: weatherCodeMap[current.weather_code] || "Sem dados",
      updated_at: current.time || null,
    };
  } catch (_error) {
    return {
      city: "Jundiai",
      temperature: null,
      unit: "C",
      summary: "Clima indisponivel",
      updated_at: null,
    };
  }
}

async function getNoticiasMotos() {
  try {
    const params = new URLSearchParams({
      q: "motos OR motocicletas Brasil",
      hl: "pt-BR",
      gl: "BR",
      ceid: "BR:pt-419",
    });

    const response = await fetch(`https://news.google.com/rss/search?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`News request failed with status ${response.status}`);
    }

    const xml = await response.text();
    return parseRss(xml);
  } catch (_error) {
    return [];
  }
}

async function getPainelClientesContexto() {
  const [weather, news] = await Promise.all([getClimaJundiai(), getNoticiasMotos()]);

  return {
    weather,
    news,
  };
}

module.exports = {
  getPainelClientesContexto,
};
