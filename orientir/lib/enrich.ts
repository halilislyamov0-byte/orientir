import { Recommendation } from "./types";

// Обогащение рекомендаций фото кампуса и официальным сайтом.
// Источник — Wikipedia + Wikidata (бесплатно, без ключа):
//   • сайт: свойство P856 «официальный сайт»
//   • фото: свойство P18 «изображение» (у вузов это обычно кампус/главный корпус)
// Если Wikidata ничего не дала — остаётся сайт, который предложил Gemini.

const UA = "Orientir/0.1 (educational project)";
const FETCH_TIMEOUT_MS = 8000;

async function getJson(url: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: controller.signal,
      // Данные о вузах меняются редко — кэшируем на сутки.
      next: { revalidate: 86400 },
    } as RequestInit);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Отбрасываем явно чужие статьи: хотя бы одно значимое слово из названия
// вуза должно встретиться в заголовке найденной страницы.
function titleMatches(query: string, title: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const stop = new Set(["university", "universitat", "college", "institute", "of", "the", "and", "for"]);
  const t = norm(title);
  return norm(query)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !stop.has(w))
    .some((w) => t.includes(w));
}

function safeHttpUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const u = new URL(value.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function commonsThumb(fileName: string, width = 800): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    fileName.replace(/ /g, "_")
  )}?width=${width}`;
}

function commonsPage(fileName: string): string {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName.replace(/ /g, "_"))}`;
}

interface WikiInfo {
  website?: string;
  imageUrl?: string;
  imageCredit?: string;
}

async function lookupUniversity(name: string): Promise<WikiInfo> {
  // 1. Ищем статью в английской Википедии
  const searchUrl =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrsearch: name,
      gsrlimit: "1",
      prop: "pageprops|pageimages",
      ppprop: "wikibase_item",
      piprop: "thumbnail|name",
      pithumbsize: "800",
    });
  const search = await getJson(searchUrl);
  const page: any = search?.query?.pages ? Object.values(search.query.pages)[0] : null;
  if (!page || !titleMatches(name, page.title ?? "")) return {};

  const info: WikiInfo = {};
  const qid: string | undefined = page.pageprops?.wikibase_item;

  // 2. Берём сайт и фото из Wikidata
  if (qid) {
    const entityData = await getJson(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
    const claims = entityData?.entities?.[qid]?.claims;
    info.website = safeHttpUrl(claims?.P856?.[0]?.mainsnak?.datavalue?.value);
    const image: unknown = claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (typeof image === "string" && !/\.svg$/i.test(image)) {
      info.imageUrl = commonsThumb(image);
      info.imageCredit = commonsPage(image);
    }
  }

  // 3. Запасное фото — главная картинка статьи (кроме svg: обычно это логотип/герб)
  if (!info.imageUrl && page.thumbnail?.source && page.pageimage && !/\.svg$/i.test(page.pageimage)) {
    info.imageUrl = page.thumbnail.source;
    info.imageCredit = commonsPage(page.pageimage);
  }

  return info;
}

export async function enrichRecommendations(recs: Recommendation[]): Promise<Recommendation[]> {
  return Promise.all(
    recs.map(async (r) => {
      const modelSite = safeHttpUrl(r.website);
      let wiki: WikiInfo = {};
      try {
        wiki = await lookupUniversity(r.universityEn || r.university);
      } catch (err) {
        console.error(`[enrich] ${r.university}:`, err);
      }
      return {
        ...r,
        website: wiki.website ?? modelSite,
        websiteVerified: Boolean(wiki.website),
        imageUrl: wiki.imageUrl,
        imageCredit: wiki.imageCredit,
      };
    })
  );
}