import { ApplicantProfile, JourneyResult } from "./types";
import { buildPrompt } from "./prompt";

// Основная модель и запасные. Квоты у Gemini считаются ОТДЕЛЬНО для каждой модели,
// поэтому при 429 имеет смысл перейти на следующую в списке.
const MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

// Модели, у которых кончилась квота: имя -> до какого времени не трогаем.
// Живёт в памяти сервера, сбрасывается при перезапуске.
const cooldown = new Map<string, number>();

function markExhausted(model: string, retryAfterMs: number) {
  cooldown.set(model, Date.now() + retryAfterMs);
  console.warn(`[gemini] ${model}: квота исчерпана, пропускаем ${Math.round(retryAfterMs / 60000)} мин`);
}

function isCooling(model: string) {
  const until = cooldown.get(model);
  if (!until) return false;
  if (Date.now() >= until) {
    cooldown.delete(model);
    return false;
  }
  return true;
}

// Сначала доступные модели, следом «остывающие» — как последний шанс.
function modelsToTry(): string[] {
  const fresh = MODELS.filter((m) => !isCooling(m));
  const cooling = MODELS.filter((m) => isCooling(m));
  return [...fresh, ...cooling];
}

// Google присылает в ошибке retryDelay вида "27s" — используем его, если есть.
function retryDelayMs(message: string): number {
  const m = message.match(/"retryDelay"\s*:\s*"(\d+)s"/);
  if (m) return Math.min(Number(m[1]) * 1000 + 1000, 15 * 60 * 1000);
  // Иначе считаем, что это дневной лимит модели: не трогаем её 30 минут.
  return 30 * 60 * 1000;
}

const modelUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Gemini 3.x сначала «думает», ответ на длинный промпт может идти 30+ секунд.
const TIMEOUT_MS = 50000;

// Ошибка с HTTP-статусом, чтобы отличать перегрузку от прочих сбоев.
class GeminiHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "GeminiHttpError";
  }
}

// 503/500 — модель перегружена, есть смысл повторить или взять запасную.
const isOverloaded = (err: unknown) =>
  err instanceof GeminiHttpError && (err.status === 503 || err.status === 500);

// 429 — кончилась квота у ЭТОЙ модели. Переходим к следующей.
const isQuota = (err: unknown) => err instanceof GeminiHttpError && err.status === 429;

const QUOTA_MESSAGE =
  "Квота Gemini API исчерпана у всех доступных моделей. Подожди несколько минут или проверь лимиты и биллинг на ai.dev/rate-limit.";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY не задан. Добавь его в .env.local (см. .env.example).");
  }
  return apiKey;
}

// Один запрос к одной модели. Возвращает текст ответа.
async function requestText(
  apiKey: string,
  model: string,
  prompt: string,
  asJson: boolean,
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(modelUrl(model), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // temperature не задаём: для Gemini 3 Google рекомендует значение по умолчанию.
        generationConfig: asJson ? { responseMimeType: "application/json" } : {},
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new GeminiHttpError(
        res.status,
        `Gemini API error (${model}): ${res.status} ${errText.slice(0, 500)}`
      );
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const finishReason = candidate?.finishReason;
    if (finishReason && finishReason !== "STOP") {
      throw new Error(`Обрыв генерации (${model}): ${finishReason}`);
    }

    // Склеиваем все текстовые части ответа, пропуская служебные «мысли» модели.
    const parts: any[] = candidate?.content?.parts ?? [];
    const text = parts
      .filter((p) => typeof p?.text === "string" && !p.thought)
      .map((p) => p.text)
      .join("")
      .trim();
    if (!text) throw new Error(`Пустой ответ от Gemini (${model})`);
    return text;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Gemini (${model}) не ответил за ${timeoutMs / 1000} с (таймаут)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function validateResult(data: any): data is JourneyResult {
  if (!data || typeof data !== "object") return false;
  const d = data.diagnosis;
  if (!d || !d.summary || !Array.isArray(d.strengths) || !Array.isArray(d.gaps) || !d.goal)
    return false;
  if (!Array.isArray(data.recommendations) || data.recommendations.length < 3) return false;
  for (const r of data.recommendations) {
    if (!r.id || !r.country || !r.university || !r.program || typeof r.matchScore !== "number" ||
        !r.why || !r.costPerYear || typeof r.isDemoData !== "boolean")
      return false;
  }
  if (!Array.isArray(data.comparison) || data.comparison.length === 0) return false;
  if (!Array.isArray(data.roadmap) || data.roadmap.length === 0) return false;
  if (!data.nextAction || !data.nextAction.title || !data.nextAction.description) return false;
  if (!data.disclaimer) return false;
  return true;
}

// Приводим оценки к целым 1..5; мусор выкидываем, чтобы не ломать расчёт на клиенте.
function normalizeScores(result: JourneyResult): JourneyResult {
  const ids = result.recommendations.map((r) => r.id);
  for (const row of result.comparison) {
    const raw: any = (row as any).scores;
    if (!raw || typeof raw !== "object") {
      delete row.scores;
      continue;
    }
    const clean: Record<string, number> = {};
    for (const id of ids) {
      const n = Number(raw[id]);
      if (Number.isFinite(n)) clean[id] = Math.min(5, Math.max(1, Math.round(n)));
    }
    if (Object.keys(clean).length === ids.length) row.scores = clean;
    else delete row.scores;
  }
  return result;
}

// Экзамены: оставляем только корректные записи; если ничего не осталось — поле убираем.
function normalizeExams(result: JourneyResult): JourneyResult {
  const raw: any = (result as any).requiredExams;
  if (!Array.isArray(raw)) {
    delete result.requiredExams;
    return result;
  }
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const clean = raw
    .filter((e: any) => e && typeof e === "object" && str(e.name))
    .slice(0, 8)
    .map((e: any) => ({
      name: str(e.name),
      countries: Array.isArray(e.countries) ? e.countries.map(str).filter(Boolean) : [],
      purpose: str(e.purpose),
      targetScore: str(e.targetScore),
      mandatory: e.mandatory !== false,
      when: str(e.when),
    }));
  if (clean.length) result.requiredExams = clean;
  else delete result.requiredExams;
  return result;
}

async function tryJourney(
  apiKey: string,
  model: string,
  profile: ApplicantProfile,
  strict: boolean
): Promise<JourneyResult> {
  const text = await requestText(apiKey, model, buildPrompt(profile, strict), true, TIMEOUT_MS);
  const cleaned = text.replace(/```json|```/g, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini (${model}) вернул не JSON: ${cleaned.slice(0, 300)}`);
  }
  if (!validateResult(parsed)) {
    throw new Error(`Ответ ${model} не прошёл валидацию структуры`);
  }
  return normalizeExams(normalizeScores(parsed));
}

export async function generateJourney(profile: ApplicantProfile): Promise<JourneyResult> {
  const apiKey = getApiKey();
  let lastErr: unknown = null;
  let strict = false;
  let quotaOnly = true;

  for (const model of modelsToTry()) {
    // Две попытки на модель; при перегрузке — пауза перед повтором.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await tryJourney(apiKey, model, profile, strict);
      } catch (err) {
        lastErr = err;
        console.error(`[gemini] ${model}, попытка ${attempt}:`, err);
        if (isQuota(err)) {
          // Квота этой модели кончилась — помечаем и сразу берём следующую
          markExhausted(model, retryDelayMs((err as Error).message));
          break;
        }
        quotaOnly = false;
        if (isOverloaded(err)) {
          if (attempt === 1) await sleep(2000);
          continue;
        }
        // Кривой JSON или валидация: повторяем со строгим напоминанием.
        strict = true;
      }
    }
  }

  if (quotaOnly) throw new Error(QUOTA_MESSAGE);
  const reason = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`Не удалось построить корректный маршрут: ${reason}`);
}

// ---------- Поиск через Google (grounding) ----------

export interface GroundedSource {
  uri: string;
  title: string;
}

export interface GroundedAnswer {
  text: string;
  sources: GroundedSource[];
  searchEntryHtml?: string; // блок «Поиск в Google», который Google просит показывать пользователю
}

// Запрос с инструментом google_search. JSON-режим с поиском раньше не поддерживался,
// поэтому просим JSON текстом и разбираем сами.
async function requestGrounded(
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs: number
): Promise<GroundedAnswer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(modelUrl(model), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new GeminiHttpError(res.status, `Gemini API error (${model}): ${res.status} ${errText.slice(0, 500)}`);
    }
    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const parts: any[] = candidate?.content?.parts ?? [];
    const text = parts
      .filter((p) => typeof p?.text === "string" && !p.thought)
      .map((p) => p.text)
      .join("")
      .trim();
    if (!text) throw new Error(`Пустой ответ от Gemini (${model})`);

    const meta = candidate?.groundingMetadata;
    const seen = new Set<string>();
    const sources: GroundedSource[] = [];
    for (const ch of meta?.groundingChunks ?? []) {
      const uri = ch?.web?.uri;
      if (typeof uri === "string" && !seen.has(uri)) {
        seen.add(uri);
        sources.push({ uri, title: String(ch?.web?.title ?? uri) });
      }
    }
    const html = meta?.searchEntryPoint?.renderedContent;
    return { text, sources, searchEntryHtml: typeof html === "string" ? html : undefined };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Gemini (${model}) не ответил за ${timeoutMs / 1000} с (таймаут)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Ответ с поиском в Google. При исчерпанной квоте берём следующую модель.
export async function generateGrounded(prompt: string): Promise<GroundedAnswer> {
  const apiKey = getApiKey();
  let lastErr: unknown = null;
  let quotaOnly = true;

  for (const model of modelsToTry()) {
    try {
      return await requestGrounded(apiKey, model, prompt, 110000);
    } catch (err) {
      lastErr = err;
      console.error(`[gemini:search] ${model}:`, err);
      if (isQuota(err)) {
        markExhausted(model, retryDelayMs((err as Error).message));
        continue; // пробуем следующую модель
      }
      quotaOnly = false;
      if (!isOverloaded(err)) break;
    }
  }

  if (quotaOnly) throw new Error(QUOTA_MESSAGE);
  const reason = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`Не удалось найти даты: ${reason}`);
}

// Короткий текстовый ответ (для пояснений).
export async function generateShortText(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  let lastErr: unknown = null;
  let quotaOnly = true;

  for (const model of modelsToTry()) {
    try {
      return await requestText(apiKey, model, prompt, false, 30000);
    } catch (err) {
      lastErr = err;
      console.error(`[gemini:text] ${model}:`, err);
      if (isQuota(err)) {
        markExhausted(model, retryDelayMs((err as Error).message));
        continue; // у другой модели своя квота
      }
      quotaOnly = false;
      if (!isOverloaded(err)) break;
    }
  }

  if (quotaOnly) throw new Error(QUOTA_MESSAGE);
  const reason = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`Не удалось получить пояснение: ${reason}`);
}