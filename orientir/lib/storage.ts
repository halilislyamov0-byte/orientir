import { ApplicantProfile, JourneyResult } from "./types";

const PROFILE_KEY = "orientir:profile";
const RESULT_KEY = "orientir:result";
const DONE_STEPS_KEY = "orientir:done-steps";

// localStorage недоступен при SSR, а в private mode само обращение к нему
// может бросить SecurityError — поэтому нужна не только проверка typeof.
function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

// Читает и разбирает ключ. Битую запись удаляет, чтобы она не ломала
// страницу при каждом следующем заходе.
function readJSON<T>(storage: Storage, key: string): T | null {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`[storage] повреждённая запись ${key}, удаляю`);
    removeKey(storage, key);
    return null;
  }
}

function removeKey(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // удалить не вышло — дальше работаем так, будто ключа нет
  }
}

function writeJSON(key: string, value: unknown) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // переполнение квоты или запрет на запись — сохранение просто пропускаем
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function saveProfile(profile: ApplicantProfile) {
  writeJSON(PROFILE_KEY, profile);
}

export function loadProfile(): ApplicantProfile | null {
  const storage = getStorage();
  if (!storage) return null;

  const parsed = readJSON<unknown>(storage, PROFILE_KEY);
  if (parsed === null) return null;

  // Валидный JSON, но не объект (например "5" или "null") — такая же
  // непригодная запись, как и ошибка парсинга.
  if (!isPlainObject(parsed)) {
    console.warn(`[storage] ${PROFILE_KEY} не объект, удаляю`);
    removeKey(storage, PROFILE_KEY);
    return null;
  }

  return parsed as unknown as ApplicantProfile;
}

export function saveResult(result: JourneyResult) {
  writeJSON(RESULT_KEY, result);
}

export function loadResult(): JourneyResult | null {
  const storage = getStorage();
  if (!storage) return null;

  const parsed = readJSON<unknown>(storage, RESULT_KEY);
  if (parsed === null) return null;

  if (!isPlainObject(parsed)) {
    console.warn(`[storage] ${RESULT_KEY} не объект, удаляю`);
    removeKey(storage, RESULT_KEY);
    return null;
  }

  return parsed as unknown as JourneyResult;
}

// Читает отмеченные шаги. Проверяет не только парсинг, но и результат:
// на валидном, но не-массивном JSON конструктор Set бросил бы TypeError.
function readDoneSteps(storage: Storage): Set<string> {
  const parsed = readJSON<unknown>(storage, DONE_STEPS_KEY);
  if (parsed === null) return new Set();

  if (!Array.isArray(parsed)) {
    console.warn(`[storage] ${DONE_STEPS_KEY} не массив, удаляю`);
    removeKey(storage, DONE_STEPS_KEY);
    return new Set();
  }

  return new Set(parsed.filter((id): id is string => typeof id === "string"));
}

export function toggleStepDone(stepId: string): Set<string> {
  const storage = getStorage();
  // Без хранилища стартуем с пустого набора: переключение всё равно
  // возвращается в UI, просто не переживёт перезагрузку страницы.
  const done = storage ? readDoneSteps(storage) : new Set<string>();

  if (done.has(stepId)) done.delete(stepId);
  else done.add(stepId);

  writeJSON(DONE_STEPS_KEY, Array.from(done));
  return done;
}

export function loadDoneSteps(): Set<string> {
  const storage = getStorage();
  if (!storage) return new Set();
  return readDoneSteps(storage);
}
