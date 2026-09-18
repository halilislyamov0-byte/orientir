"use client";

import Link from "next/link";
import { Fragment, createElement, useEffect, useMemo, useState } from "react";
import {
  ApplicantProfile,
  JourneyResult,
  RequiredExam,
  RoadmapCategory,
} from "@/lib/types";
import {
  loadDoneSteps,
  loadProfile,
  loadResult,
  saveProfile,
  saveResult,
  toggleStepDone,
} from "@/lib/storage";

const STAGE_LABELS = [
  "Профиль",
  "Диагностика",
  "Рекомендации",
  "Сравнение",
  "Маршрут",
  "Следующий шаг",
] as const;

const EMPTY_PROFILE: ApplicantProfile = {
  grade: "10",
  interests: "",
  subjects: "",
  languages: "",
  exams: "",
  countries: [],
  budget: "",
  timeline: "",
  constraints: "",
};

const MONTHS = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

const YEARS = ["2026", "2027", "2028", "2029", "2030"];

const ALL_COUNTRIES = [
  "Австралия", "Австрия", "Азербайджан", "Албания", "Алжир", "Аргентина", "Армения",
  "Бахрейн", "Беларусь", "Бельгия", "Болгария", "Бразилия", "Великобритания", "Венгрия",
  "Вьетнам", "Германия", "Греция", "Грузия", "Дания", "Египет", "Израиль", "Индия",
  "Индонезия", "Иордания", "Ирландия", "Испания", "Италия", "Казахстан", "Канада",
  "Катар", "Кипр", "Китай", "Кувейт", "Кыргызстан", "Латвия", "Литва", "Люксембург",
  "Малайзия", "Мальта", "Марокко", "Мексика", "Нидерланды", "Новая Зеландия", "Норвегия",
  "ОАЭ", "Оман", "Польша", "Португалия", "Россия", "Румыния", "Саудовская Аравия",
  "Сингапур", "Словакия", "Словения", "США", "Таиланд", "Тунис", "Турция", "Узбекистан",
  "Украина", "Филиппины", "Финляндия", "Франция", "Хорватия", "Чехия", "Чили", "Швейцария",
  "Швеция", "Эстония", "Южная Корея", "Япония",
];

const POPULAR_COUNTRIES = [
  "Казахстан", "Турция", "ОАЭ", "Южная Корея", "Германия", "Великобритания", "США",
];

const BUDGET_OPTIONS = ["Грант", "Полугрант", "Платная основа"];

const CATEGORY_LABEL: Record<RoadmapCategory, string> = {
  exam: "Экзамен",
  document: "Документ",
  deadline: "Дедлайн",
  activity: "Активность",
};

export default function JourneyPage() {
  const [stage, setStage] = useState(0);
  const [profile, setProfile] = useState<ApplicantProfile>(EMPTY_PROFILE);
  const [result, setResult] = useState<JourneyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneSteps, setDoneSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    const savedProfile = loadProfile();
    const savedResult = loadResult();
    if (savedProfile) setProfile(savedProfile);
    // /journey?new=1 — открыть анкету, даже если маршрут уже построен
    const startFromProfile = new URLSearchParams(window.location.search).has("new");
    if (savedResult) {
      setResult(savedResult);
      setStage(startFromProfile ? 0 : 1);
    }
    setDoneSteps(loadDoneSteps());
  }, []);

  async function runGeneration(nextProfile: ApplicantProfile) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextProfile),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Не получилось построить маршрут");
      }
      const data = (await res.json()) as JourneyResult;
      setResult(data);
      saveResult(data);
      setStage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }

  function handleProfileSubmit() {
    // Экзамены больше не спрашиваем — их подбирает ИИ по странам
    const cleanProfile = { ...profile, exams: "" };
    setProfile(cleanProfile);
    saveProfile(cleanProfile);
    runGeneration(cleanProfile);
  }

  function handleToggleStep(id: string) {
    setDoneSteps(toggleStepDone(id));
  }

  return (
    <main className="min-h-screen">
      <header className="mx-auto max-w-6xl px-4 sm:px-6 pt-4 sm:pt-5 flex items-center justify-between gap-3">
        <Link href="/" className="font-hero text-lg" style={{ color: "var(--color-ink)" }}>
          Ориентир
        </Link>
        <Link href="/" className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
          ← На главную
        </Link>
      </header>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 md:py-12 grid md:grid-cols-[220px_1fr] gap-6 md:gap-10">
        <aside className="md:sticky md:top-10 h-fit">
          <ol className="flex md:flex-col gap-4 overflow-x-auto no-scrollbar md:overflow-visible pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            {STAGE_LABELS.map((label, i) => {
              const active = i === stage;
              const reachable = i === 0 || result !== null;
              return (
                <li key={label} className="flex md:items-start items-center gap-3 shrink-0">
                  <button
                    disabled={!reachable}
                    onClick={() => reachable && setStage(i)}
                    className="flex items-center gap-3 text-left disabled:opacity-40"
                  >
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                      style={{
                        background: active ? "var(--color-accent)" : "var(--color-paper-raised)",
                        color: active ? "var(--color-ink)" : "var(--color-ink-soft)",
                        border: `1px solid ${active ? "var(--color-accent)" : "var(--color-line)"}`,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: active ? "var(--color-ink)" : "var(--color-ink-soft)" }}
                    >
                      {label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <section>
          {stage === 0 && (
            <ProfileForm
              profile={profile}
              setProfile={setProfile}
              onSubmit={handleProfileSubmit}
              loading={loading}
              error={error}
              hasResult={result !== null}
            />
          )}

          {stage >= 1 && result && (
            <>
              {stage === 1 && <DiagnosisView result={result} onNext={() => setStage(2)} onEdit={() => setStage(0)} />}
              {stage === 2 && (
                <RecommendationsView result={result} onNext={() => setStage(3)} onBack={() => setStage(1)} />
              )}
              {stage === 3 && (
                <ComparisonView
                  result={result}
                  grade={profile.grade}
                  onNext={() => setStage(4)}
                  onBack={() => setStage(2)}
                />
              )}
              {stage === 4 && (
                <RoadmapView
                  result={result}
                  doneSteps={doneSteps}
                  onToggle={handleToggleStep}
                  onNext={() => setStage(5)}
                  onBack={() => setStage(3)}
                />
              )}
              {stage === 5 && (
                <NextActionView
                  result={result}
                  doneSteps={doneSteps}
                  onToggle={handleToggleStep}
                  onBack={() => setStage(4)}
                  onEditProfile={() => setStage(0)}
                />
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm mb-1.5" style={{ color: "var(--color-ink-soft)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg px-3.5 py-2.5 text-sm bg-white outline-none focus:ring-2";

function ProfileForm({
  profile,
  setProfile,
  onSubmit,
  loading,
  error,
  hasResult,
}: {
  profile: ApplicantProfile;
  setProfile: (p: ApplicantProfile) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
  hasResult: boolean;
}) {
  const valid = profile.grade && profile.countries.length > 0 && profile.interests;

  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [budgetTypes, setBudgetTypes] = useState<string[]>([]);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [countrySearch, setCountrySearch] = useState("");

  useEffect(() => {
    const parts = profile.timeline.trim().split(" ").filter(Boolean);
    let m = "";
    let y = "";
    for (const p of parts) {
      if (MONTHS.includes(p)) m = p;
      if (YEARS.includes(p)) y = p;
    }
    setMonth(m);
    setYear(y);

    // Бюджет хранится строкой вида "Грант, Полугрант, Платная основа, до 5000$ в год"
    setBudgetTypes(BUDGET_OPTIONS.filter((o) => profile.budget.includes(o)));
    const match = profile.budget.match(/до (\d+)\$/);
    setBudgetAmount(match ? match[1] : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyTimeline(m: string, y: string) {
    setMonth(m);
    setYear(y);
    const parts = [m, y].filter(Boolean);
    setProfile({ ...profile, timeline: parts.join(" ") });
  }

  function applyBudget(types: string[], amount: string) {
    // Сохраняем порядок как в BUDGET_OPTIONS, чтобы строка была стабильной
    const ordered = BUDGET_OPTIONS.filter((o) => types.includes(o));
    const paid = ordered.includes("Платная основа");
    const cleanAmount = paid ? amount : "";
    setBudgetTypes(ordered);
    setBudgetAmount(cleanAmount);
    const parts = ordered.map((o) =>
      o === "Платная основа" && cleanAmount ? "Платная основа, до " + cleanAmount + "$ в год" : o
    );
    setProfile({ ...profile, budget: parts.join(", ") });
  }

  function toggleBudget(opt: string) {
    const next = budgetTypes.includes(opt)
      ? budgetTypes.filter((t) => t !== opt)
      : [...budgetTypes, opt];
    applyBudget(next, budgetAmount);
  }

  function addCountry(c: string) {
    if (!profile.countries.includes(c)) {
      setProfile({ ...profile, countries: [...profile.countries, c] });
    }
    setCountrySearch("");
  }

  function removeCountry(c: string) {
    setProfile({ ...profile, countries: profile.countries.filter((x) => x !== c) });
  }

  const filteredCountries = countrySearch.trim()
    ? ALL_COUNTRIES.filter(
        (c) =>
          c.toLowerCase().includes(countrySearch.trim().toLowerCase()) &&
          !profile.countries.includes(c)
      ).slice(0, 6)
    : [];

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl mb-2">Расскажи о себе</h2>
      <p className="text-sm mb-8" style={{ color: "var(--color-ink-soft)" }}>
        Это займёт пару минут. Чем точнее ответишь, тем точнее будет маршрут.
      </p>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Класс">
          <select
            className={inputClass}
            style={{ border: "1px solid var(--color-line)" }}
            value={profile.grade}
            onChange={(e) => setProfile({ ...profile, grade: e.target.value })}
          >
            <option value="9">9 класс</option>
            <option value="10">10 класс</option>
            <option value="11">11 класс</option>
          </select>
        </Field>
        <Field label="Когда планируешь поступать">
          <div className="flex gap-2">
            <select
              className={inputClass}
              style={{ border: "1px solid var(--color-line)" }}
              value={month}
              onChange={(e) => applyTimeline(e.target.value, year)}
            >
              <option value="">Месяц</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              className={inputClass}
              style={{ border: "1px solid var(--color-line)" }}
              value={year}
              onChange={(e) => applyTimeline(month, e.target.value)}
            >
              <option value="">Год</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Интересы и направления (что нравится изучать)">
          <textarea
            className={inputClass}
            style={{ border: "1px solid var(--color-line)" }}
            rows={2}
            placeholder="напр. программирование, биология, дизайн"
            value={profile.interests}
            onChange={(e) => setProfile({ ...profile, interests: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Сильные предметы и успеваемость">
          <textarea
            className={inputClass}
            style={{ border: "1px solid var(--color-line)" }}
            rows={2}
            placeholder="напр. математика и физика на отлично, средний балл 4.6"
            value={profile.subjects}
            onChange={(e) => setProfile({ ...profile, subjects: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Языки и уровень">
          <input
            className={inputClass}
            style={{ border: "1px solid var(--color-line)" }}
            placeholder="напр. английский B2, турецкий A2"
            value={profile.languages}
            onChange={(e) => setProfile({ ...profile, languages: e.target.value })}
          />
        </Field>
        <p className="text-xs mt-1.5" style={{ color: "var(--color-ink-soft)" }}>
          Какие экзамены сдавать, мы подберём сами — по странам, которые ты выберешь.
        </p>
      </div>

      <div className="mt-5">
        <span className="block text-sm mb-2" style={{ color: "var(--color-ink-soft)" }}>
          Интересующие страны
        </span>
        {profile.countries.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {profile.countries.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm"
                style={{ background: "var(--color-ink)", color: "var(--color-paper)" }}
              >
                {c}
                <button
                  type="button"
                  onClick={() => removeCountry(c)}
                  className="leading-none"
                  style={{ opacity: 0.7 }}
                  aria-label={"Убрать " + c}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="relative">
          <input
            className={inputClass}
            style={{ border: "1px solid var(--color-line)" }}
            placeholder="Начни печатать название страны…"
            value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)}
          />
          {filteredCountries.length > 0 && (
            <div
              className="absolute z-10 mt-1 w-full rounded-lg overflow-hidden"
              style={{ background: "white", border: "1px solid var(--color-line)", boxShadow: "0 8px 24px rgba(23,33,58,0.10)" }}
            >
              {filteredCountries.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => addCountry(c)}
                  className="block w-full text-left px-3.5 py-2 text-sm hover:bg-black/5"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {POPULAR_COUNTRIES.filter((c) => !profile.countries.includes(c)).map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => addCountry(c)}
              className="rounded-full px-3 py-1 text-sm"
              style={{ background: "white", color: "var(--color-ink)", border: "1px solid var(--color-line)" }}
            >
              + {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <span className="block text-sm mb-2" style={{ color: "var(--color-ink-soft)" }}>
          Бюджет на обучение
        </span>
        <p className="text-xs mb-2" style={{ color: "var(--color-ink-soft)" }}>
          Можно выбрать несколько вариантов
        </p>
        <div className="flex flex-wrap gap-2">
          {BUDGET_OPTIONS.map((opt) => {
            const active = budgetTypes.includes(opt);
            return (
              <button
                type="button"
                key={opt}
                aria-pressed={active}
                onClick={() => toggleBudget(opt)}
                className="rounded-full px-3.5 py-1.5 text-sm transition-colors"
                style={{
                  background: active ? "var(--color-ink)" : "white",
                  color: active ? "var(--color-paper)" : "var(--color-ink)",
                  border: "1px solid " + (active ? "var(--color-ink)" : "var(--color-line)"),
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {budgetTypes.includes("Платная основа") && (
          <div className="mt-3 relative max-w-xs">
            <input
              className={inputClass}
              style={{ border: "1px solid var(--color-line)", paddingRight: "2rem" }}
              type="number"
              min="0"
              placeholder="Сколько готов платить в год"
              value={budgetAmount}
              onChange={(e) => applyBudget(budgetTypes, e.target.value)}
            />
            <span
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: "var(--color-ink-soft)" }}
            >
              $
            </span>
          </div>
        )}
      </div>

      <div className="mt-5">
        <Field label="Другие ограничения">
          <input
            className={inputClass}
            style={{ border: "1px solid var(--color-line)" }}
            placeholder="напр. только онлайн, близко к дому"
            value={profile.constraints}
            onChange={(e) => setProfile({ ...profile, constraints: e.target.value })}
          />
        </Field>
      </div>

      {error && (
        <p className="mt-5 text-sm rounded-lg px-4 py-3" style={{ background: "var(--color-flag-soft)", color: "var(--color-flag)" }}>
          {error}
        </p>
      )}

      <button
        disabled={!valid || loading}
        onClick={onSubmit}
        className="mt-8 inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-medium disabled:opacity-40 w-full sm:w-auto"
        style={{ background: "var(--color-ink)", color: "var(--color-paper)" }}
      >
        {loading ? "Строим маршрут…" : hasResult ? "Пересчитать маршрут" : "Построить маршрут"}
      </button>
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  nextLabel = "Дальше",
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="mt-10 flex items-center gap-3 flex-wrap">
      {onBack && (
        <button onClick={onBack} className="text-sm px-4 py-2 rounded-full" style={{ border: "1px solid var(--color-line)" }}>
          Назад
        </button>
      )}
      {onNext && (
        <button
          onClick={onNext}
          className="text-sm px-5 py-2.5 rounded-full font-medium"
          style={{ background: "var(--color-ink)", color: "var(--color-paper)" }}
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}

function DiagnosisView({
  result,
  onNext,
  onEdit,
}: {
  result: JourneyResult;
  onNext: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl mb-4">Вот что мы увидели в твоём профиле</h2>
      <p className="text-base leading-relaxed">{result.diagnosis.summary}</p>

      <div className="grid sm:grid-cols-2 gap-6 mt-8">
        <div>
          <h3 className="text-sm mb-3" style={{ color: "var(--color-progress)" }}>Сильные стороны</h3>
          <ul className="space-y-2 text-sm">
            {result.diagnosis.strengths.map((s, i) => (
              <li key={i}>— {s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm mb-3" style={{ color: "var(--color-flag)" }}>Над чем стоит поработать</h3>
          <ul className="space-y-2 text-sm">
            {result.diagnosis.gaps.map((s, i) => (
              <li key={i}>— {s}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 rounded-xl p-5" style={{ background: "var(--color-paper-raised)", border: "1px solid var(--color-line)" }}>
        <h3 className="text-sm mb-1.5" style={{ color: "var(--color-ink-soft)" }}>Образовательная цель</h3>
        <p className="text-base">{result.diagnosis.goal}</p>
      </div>

      <button onClick={onEdit} className="mt-4 text-sm underline" style={{ color: "var(--color-ink-soft)" }}>
        Изменить анкету
      </button>

      <StepNav onNext={onNext} nextLabel="Смотреть рекомендации" />
    </div>
  );
}

function RecommendationsView({
  result,
  onNext,
  onBack,
}: {
  result: JourneyResult;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl mb-2">Подходящие варианты</h2>
      <p className="text-sm mb-8" style={{ color: "var(--color-ink-soft)" }}>
        {result.recommendations.length} программы(-ы), отсортированные по совпадению с профилем.
      </p>

      <ExamsBlock exams={result.requiredExams} />

      <h3 className="text-lg mb-3">Программы</h3>
      <div className="space-y-4">
        {result.recommendations.map((r) => (
          <div
            key={r.id}
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--color-paper-raised)", border: "1px solid var(--color-line)" }}
          >
            <CampusImage src={r.imageUrl} alt={"Кампус " + r.university} credit={r.imageCredit} />
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--color-ink-soft)" }}>{r.country} · {r.program}</p>
                  <h3 className="text-lg">{r.university}</h3>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className="text-sm font-medium rounded-full px-3 py-1"
                    style={{ background: "var(--color-progress-soft)", color: "var(--color-progress)" }}
                  >
                    {r.matchScore}%
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed">{r.why}</p>
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <span className="text-sm" style={{ color: "var(--color-ink-soft)" }}>{r.costPerYear} в год</span>
                {r.isDemoData ? (
                  <span className="text-xs rounded-full px-2.5 py-1" style={{ background: "var(--color-flag-soft)", color: "var(--color-flag)" }}>
                    Демонстрационные данные — проверь на сайте вуза
                  </span>
                ) : r.source ? (
                  <span className="text-xs" style={{ color: "var(--color-ink-soft)" }}>Источник: {r.source}</span>
                ) : null}
              </div>
              {r.website && (
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <ExternalLink
                    href={r.website}
                    className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-full font-medium"
                    style={{ background: "var(--color-ink)", color: "var(--color-paper)" }}
                  >
                    Официальный сайт ↗
                  </ExternalLink>
                  <span className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                    {hostOf(r.website)}
                    {!r.websiteVerified && " · адрес предложен ИИ, проверь"}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <StepNav onBack={onBack} onNext={onNext} nextLabel="Сравнить варианты" />
    </div>
  );
}

function ExamsBlock({ exams }: { exams?: RequiredExam[] }) {
  if (!exams || exams.length === 0) {
    return (
      <p
        className="mb-8 text-sm rounded-lg px-4 py-3"
        style={{ background: "var(--color-accent-soft)", color: "var(--color-ink)" }}
      >
        Список нужных экзаменов появится после пересчёта маршрута.
      </p>
    );
  }
  // Сначала обязательные
  const sorted = [...exams].sort((a, b) => Number(b.mandatory) - Number(a.mandatory));
  return (
    <div className="mb-10">
      <h3 className="text-lg mb-1">Какие экзамены сдавать</h3>
      <p className="text-sm mb-4" style={{ color: "var(--color-ink-soft)" }}>
        Подобрано под страны из твоей анкеты. Требования отличаются у разных вузов — сверяйся с их сайтами.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {sorted.map((e, i) => (
          <div
            key={e.name + i}
            className="rounded-xl p-4"
            style={{ background: "var(--color-paper-raised)", border: "1px solid var(--color-line)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-base font-medium">{e.name}</h4>
              <span
                className="text-[11px] rounded-full px-2 py-0.5 shrink-0"
                style={
                  e.mandatory
                    ? { background: "var(--color-flag-soft)", color: "var(--color-flag)" }
                    : { background: "var(--color-line)", color: "var(--color-ink-soft)" }
                }
              >
                {e.mandatory ? "Обязательно" : "Желательно"}
              </span>
            </div>
            {e.countries.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {e.countries.map((c) => (
                  <span
                    key={c}
                    className="text-[11px] rounded-full px-2 py-0.5"
                    style={{ background: "var(--color-accent-soft)", color: "var(--color-ink)" }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
            {e.purpose && <p className="mt-2 text-sm leading-relaxed">{e.purpose}</p>}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--color-ink-soft)" }}>
              {e.targetScore && <span>Цель: {e.targetScore}</span>}
              {e.when && <span>Когда: {e.when}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Внешняя ссылка, открывается в новой вкладке.
// createElement вместо JSX-тега — чтобы код не ломался при копировании из чата.
function ExternalLink({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return createElement(
    "a",
    { href, target: "_blank", rel: "noopener noreferrer", className, style },
    children
  );
}

function CampusImage({ src, alt, credit }: { src?: string; alt: string; credit?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className="h-32 sm:h-40 flex items-center justify-center text-sm"
        style={{ background: "var(--color-line)", color: "var(--color-ink-soft)" }}
      >
        Фото кампуса не найдено
      </div>
    );
  }
  return (
    <div className="relative h-40 sm:h-56" style={{ background: "var(--color-line)" }}>
      {createElement("img", {
        src,
        alt,
        loading: "lazy",
        referrerPolicy: "no-referrer",
        onError: () => setFailed(true),
        className: "w-full h-full object-cover",
      })}
      {credit && (
        <ExternalLink
          href={credit}
          className="absolute bottom-2 right-2 text-[11px] px-2 py-0.5 rounded"
          style={{ background: "rgba(0,0,0,0.55)", color: "white" }}
        >
          Фото: Wikimedia Commons
        </ExternalLink>
      )}
    </div>
  );
}

const WEIGHT_LABELS = ["Не важно", "Немного", "Важно", "Очень важно"];
const DEFAULT_WEIGHT = 2;

type ExplainState = { status: "loading" } | { status: "done"; text: string } | { status: "error"; text: string };

function ComparisonView({
  result,
  grade,
  onNext,
  onBack,
}: {
  result: JourneyResult;
  grade: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const rows = result.comparison;
  const hasScores = rows.length > 0 && rows.every((row) => row.scores);

  // Вес каждого параметра (0..3), индекс строки -> вес
  const [weights, setWeights] = useState<number[]>(() => rows.map(() => DEFAULT_WEIGHT));
  // Пояснения от ИИ по строкам
  const [explain, setExplain] = useState<Record<number, ExplainState>>({});

  useEffect(() => {
    setWeights(rows.map(() => DEFAULT_WEIGHT));
    setExplain({});
  }, [rows]);

  // Личный счёт каждого вуза: взвешенное среднее оценок, 0..100
  const personal = useMemo(() => {
    const out: Record<string, number> = {};
    if (!hasScores) return out;
    const totalWeight = weights.reduce((a, w) => a + w, 0);
    for (const r of result.recommendations) {
      if (totalWeight === 0) {
        out[r.id] = 0;
        continue;
      }
      let sum = 0;
      rows.forEach((row, i) => {
        const score = row.scores?.[r.id] ?? 1;
        sum += weights[i] * ((score - 1) / 4); // 1..5 -> 0..1
      });
      out[r.id] = Math.round((sum / totalWeight) * 100);
    }
    return out;
  }, [hasScores, weights, rows, result.recommendations]);

  // Колонки: при наличии оценок — по личному счёту
  const recs = useMemo(() => {
    const list = [...result.recommendations];
    if (hasScores) list.sort((a, b) => (personal[b.id] ?? 0) - (personal[a.id] ?? 0));
    return list;
  }, [result.recommendations, hasScores, personal]);

  const allZero = weights.every((w) => w === 0);
  const leaderId = hasScores && !allZero ? recs[0]?.id : undefined;

  function setWeight(i: number, w: number) {
    setWeights((prev) => prev.map((x, idx) => (idx === i ? w : x)));
  }

  async function toggleExplain(i: number) {
    const current = explain[i];
    if (current && current.status !== "error") {
      // Повторный клик — свернуть
      setExplain((prev) => {
        const next = { ...prev };
        delete next[i];
        return next;
      });
      return;
    }
    setExplain((prev) => ({ ...prev, [i]: { status: "loading" } }));
    try {
      const row = rows[i];
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criterion: row.criterion,
          grade,
          options: result.recommendations.map((r) => ({
            university: r.university,
            value: row.values[r.id] ?? "",
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.text) throw new Error(data.error || "Не удалось получить пояснение");
      setExplain((prev) => ({ ...prev, [i]: { status: "done", text: data.text } }));
    } catch (e) {
      setExplain((prev) => ({
        ...prev,
        [i]: { status: "error", text: e instanceof Error ? e.message : "Ошибка" },
      }));
    }
  }

  // Цвет ячейки: лучший в строке — зелёный, худший — красный (если есть разница)
  function cellTone(i: number, id: string): React.CSSProperties {
    const sc = rows[i].scores;
    if (!sc || weights[i] === 0) return {};
    const vals = Object.values(sc);
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    if (max === min) return {};
    if (sc[id] === max) return { background: "var(--color-progress-soft)", color: "var(--color-progress)" };
    if (sc[id] === min) return { background: "var(--color-flag-soft)", color: "var(--color-flag)" };
    return {};
  }

  const colCount = recs.length + 1;

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl mb-2">Сравнение по важным параметрам</h2>
      <p className="text-sm mb-6" style={{ color: "var(--color-ink-soft)" }}>
        {hasScores
          ? "Отметь, что для тебя важнее, — варианты пересчитаются и выстроятся под тебя. Нажми «?» у параметра, чтобы получить пояснение."
          : "Смотри построчно, что отличает варианты друг от друга. Нажми «?» у параметра, чтобы получить пояснение."}
      </p>

      {!hasScores && (
        <p
          className="mb-6 text-sm rounded-lg px-4 py-3"
          style={{ background: "var(--color-accent-soft)", color: "var(--color-ink)" }}
        >
          Личный рейтинг и подсветка появятся после пересчёта маршрута: этот результат построен до обновления.
        </p>
      )}

      <p className="sm:hidden text-xs mb-2" style={{ color: "var(--color-ink-soft)" }}>
        Таблицу можно прокручивать вбок пальцем.
      </p>

      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--color-line)" }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "var(--color-paper-raised)" }}>
              <th
                className="sticky-col text-left px-3 sm:px-4 py-3 font-medium align-bottom min-w-[170px] sm:min-w-[220px]"
                style={{ borderBottom: "1px solid var(--color-line)", background: "var(--color-paper-raised)" }}
              >
                Параметр
              </th>
              {recs.map((r) => {
                const isLeader = r.id === leaderId;
                return (
                  <th
                    key={r.id}
                    className="text-left px-3 sm:px-4 py-3 font-medium align-bottom min-w-[150px] sm:min-w-[180px]"
                    style={{
                      borderBottom: "1px solid var(--color-line)",
                      boxShadow: isLeader ? "inset 0 3px 0 var(--color-progress)" : undefined,
                    }}
                  >
                    {hasScores && (
                      <div className="mb-2">
                        {isLeader && (
                          <span
                            className="inline-block text-[11px] rounded-full px-2 py-0.5 mb-1.5"
                            style={{ background: "var(--color-progress)", color: "white" }}
                          >
                            Лучший для тебя
                          </span>
                        )}
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl" style={{ color: "var(--color-ink)" }}>
                            {allZero ? "—" : personal[r.id]}
                          </span>
                          <span className="text-xs font-normal" style={{ color: "var(--color-ink-soft)" }}>
                            из 100
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-line)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${allZero ? 0 : personal[r.id]}%`,
                              background: isLeader ? "var(--color-progress)" : "var(--color-ink-soft)",
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {r.university}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const ex = explain[i];
              const muted = hasScores && weights[i] === 0;
              return (
                <Fragment key={i}>
                  <tr
                    style={{
                      background: i % 2 ? "var(--color-paper)" : "white",
                      opacity: muted ? 0.45 : 1,
                      transition: "opacity 0.2s",
                    }}
                  >
                    <td
                      className="sticky-col px-3 sm:px-4 py-3 align-top"
                      style={{ background: i % 2 ? "var(--color-paper)" : "white" }}
                    >
                      <div className="flex items-start gap-2">
                        <span style={{ color: "var(--color-ink-soft)" }}>{row.criterion}</span>
                        <button
                          type="button"
                          onClick={() => toggleExplain(i)}
                          aria-label={"Пояснение: " + row.criterion}
                          aria-expanded={Boolean(ex)}
                          className="shrink-0 w-5 h-5 rounded-full text-xs leading-none flex items-center justify-center"
                          style={{
                            border: "1px solid var(--color-line)",
                            background: ex ? "var(--color-ink)" : "white",
                            color: ex ? "var(--color-paper)" : "var(--color-ink-soft)",
                          }}
                        >
                          ?
                        </button>
                      </div>
                      {hasScores && (
                        <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label={"Важность: " + row.criterion}>
                          {WEIGHT_LABELS.map((label, w) => {
                            const active = weights[i] === w;
                            return (
                              <button
                                type="button"
                                key={w}
                                aria-pressed={active}
                                onClick={() => setWeight(i, w)}
                                className="rounded-full px-2 py-1 text-[11px] transition-colors"
                                style={{
                                  background: active ? "var(--color-ink)" : "white",
                                  color: active ? "var(--color-paper)" : "var(--color-ink-soft)",
                                  border: "1px solid " + (active ? "var(--color-ink)" : "var(--color-line)"),
                                }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    {recs.map((r) => (
                      <td key={r.id} className="px-3 sm:px-4 py-3 align-top">
                        <div className="rounded-md px-2 py-1 -mx-2 -my-1 transition-colors" style={cellTone(i, r.id)}>
                          {row.values[r.id] ?? "—"}
                        </div>
                      </td>
                    ))}
                  </tr>
                  {ex && (
                    <tr style={{ background: "var(--color-paper-raised)" }}>
                      <td colSpan={colCount} className="px-4 py-3">
                        {ex.status === "loading" && (
                          <span style={{ color: "var(--color-ink-soft)" }}>Готовим пояснение…</span>
                        )}
                        {ex.status === "done" && <p className="leading-relaxed">{ex.text}</p>}
                        {ex.status === "error" && (
                          <span style={{ color: "var(--color-flag)" }}>
                            {ex.text}{" "}
                            <button type="button" className="underline" onClick={() => toggleExplain(i)}>
                              Повторить
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasScores && (
        <div className="mt-3 flex items-center gap-4 flex-wrap text-xs" style={{ color: "var(--color-ink-soft)" }}>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: "var(--color-progress-soft)" }} /> лучше в строке
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: "var(--color-flag-soft)" }} /> слабее в строке
          </span>
          <button
            type="button"
            className="underline"
            onClick={() => setWeights(rows.map(() => DEFAULT_WEIGHT))}
          >
            Сбросить важность
          </button>
          <span>Оценки поставил ИИ — это ориентир, а не истина.</span>
        </div>
      )}

      <StepNav onBack={onBack} onNext={onNext} nextLabel="Смотреть маршрут" />
    </div>
  );
}

function RoadmapView({
  result,
  doneSteps,
  onToggle,
  onNext,
  onBack,
}: {
  result: JourneyResult;
  doneSteps: Set<string>;
  onToggle: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl mb-2">Твой маршрут</h2>
      <p className="text-sm mb-8" style={{ color: "var(--color-ink-soft)" }}>
        Отмечай шаги по мере выполнения — прогресс сохраняется.
      </p>

      <ol className="space-y-3">
        {result.roadmap.map((step) => {
          const done = doneSteps.has(step.id);
          return (
            <li
              key={step.id}
              className="rounded-xl p-4 flex gap-3 items-start"
              style={{
                background: "var(--color-paper-raised)",
                border: "1px solid var(--color-line)",
                opacity: done ? 0.6 : 1,
              }}
            >
              <button
                onClick={() => onToggle(step.id)}
                className="w-6 h-6 mt-0.5 rounded-full shrink-0"
                style={{
                  border: `1.5px solid ${done ? "var(--color-progress)" : "var(--color-line)"}`,
                  background: done ? "var(--color-progress)" : "transparent",
                }}
                aria-label="Отметить как выполнено"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs rounded-full px-2 py-0.5" style={{ background: "var(--color-accent-soft)", color: "var(--color-ink)" }}>
                    {CATEGORY_LABEL[step.category]}
                  </span>
                  <h3 className={"text-base" + (done ? " line-through" : "")}>{step.title}</h3>
                </div>
                <p className="text-sm mt-1" style={{ color: "var(--color-ink-soft)" }}>{step.description}</p>
                <p className="text-xs mt-1" style={{ color: "var(--color-ink-soft)" }}>{step.dueHint}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <StepNav onBack={onBack} onNext={onNext} nextLabel="Ближайший шаг" />
    </div>
  );
}

function NextActionView({
  result,
  doneSteps,
  onToggle,
  onBack,
  onEditProfile,
}: {
  result: JourneyResult;
  doneSteps: Set<string>;
  onToggle: (id: string) => void;
  onBack: () => void;
  onEditProfile: () => void;
}) {
  const steps = result.roadmap;
  const total = steps.length;
  const doneCount = steps.filter((s) => doneSteps.has(s.id)).length;
  const allDone = total > 0 && doneCount === total;

  // Ближайший шаг — первый невыполненный по порядку плана
  const nextIndex = steps.findIndex((s) => !doneSteps.has(s.id));
  const next = nextIndex >= 0 ? steps[nextIndex] : null;
  const upcoming = nextIndex >= 0 ? steps.slice(nextIndex + 1).filter((s) => !doneSteps.has(s.id)).slice(0, 2) : [];

  // Главная цель — вариант с наибольшим совпадением
  const target = [...result.recommendations].sort((a, b) => b.matchScore - a.matchScore)[0];
  const targetLabel = target ? `${target.university} (${target.country})` : "";

  let progressNote: string;
  if (allDone) progressNote = "Все шаги плана отмечены — отличная работа!";
  else if (doneCount === 0) progressNote = "Ты в самом начале пути — начни с этого шага.";
  else if (doneCount / total < 0.5) progressNote = `Уже ${doneCount} из ${total} — хороший темп, продолжай.`;
  else if (total - doneCount === 1) progressNote = "Остался последний шаг до финиша!";
  else progressNote = `Больше половины позади: осталось ${total - doneCount} шаг(а/ов).`;

  const isFirst = doneCount === 0 && nextIndex === 0;
  const title = next ? next.title : "Маршрут пройден";
  const description = next
    ? isFirst && result.nextAction.description
      ? result.nextAction.description
      : next.description
    : `Ты выполнил все шаги плана${targetLabel ? ` для поступления в ${targetLabel}` : ""}. Проверь актуальные дедлайны и требования на официальном сайте вуза и следи за почтой после подачи документов.`;

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl mb-2">{allDone ? "Готово!" : "Начни с этого"}</h2>
      <p className="text-sm mb-6" style={{ color: "var(--color-ink-soft)" }}>
        {progressNote}
      </p>

      <div
        className="rounded-xl p-5 sm:p-6"
        style={{
          background: allDone ? "var(--color-progress)" : "var(--color-ink)",
          color: "var(--color-paper)",
          transition: "background 0.3s",
        }}
      >
        <div className="flex items-center gap-2 flex-wrap mb-2 text-sm opacity-80">
          <span>{allDone ? "Итог" : `Ближайший шаг · ${nextIndex + 1} из ${total}`}</span>
          {next && (
            <span className="text-xs rounded-full px-2 py-0.5" style={{ background: "rgba(255,255,255,0.15)" }}>
              {CATEGORY_LABEL[next.category]}
            </span>
          )}
        </div>
        <h3 className="text-xl mb-3">{title}</h3>
        <p className="text-sm leading-relaxed opacity-90">{description}</p>
        {next?.dueHint && <p className="text-xs mt-3 opacity-70">Когда: {next.dueHint}</p>}
        {targetLabel && <p className="text-xs mt-1 opacity-70">Цель: {targetLabel}</p>}
        {next && (
          <button
            type="button"
            onClick={() => onToggle(next.id)}
            className="mt-5 inline-flex items-center justify-center gap-2 text-sm font-medium rounded-full px-4 py-2.5 w-full sm:w-auto"
            style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}
          >
            ✓ Выполнено — показать следующий
          </button>
        )}
      </div>

      {upcoming.length > 0 && (
        <div className="mt-5">
          <p className="text-xs mb-2" style={{ color: "var(--color-ink-soft)" }}>Дальше по плану</p>
          <ul className="space-y-2">
            {upcoming.map((s) => (
              <li
                key={s.id}
                className="text-sm rounded-lg px-3 py-2 flex items-center justify-between gap-3"
                style={{ background: "var(--color-paper-raised)", border: "1px solid var(--color-line)" }}
              >
                <span>{s.title}</span>
                <span className="text-xs shrink-0" style={{ color: "var(--color-ink-soft)" }}>
                  {CATEGORY_LABEL[s.category]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-line)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ background: "var(--color-progress)", width: `${total ? (doneCount / total) * 100 : 0}%` }}
          />
        </div>
        <span className="text-sm shrink-0" style={{ color: "var(--color-ink-soft)" }}>
          {doneCount} из {total} шагов
        </span>
      </div>

      {allDone && (
        <button
          type="button"
          onClick={() => steps.forEach((s) => onToggle(s.id))}
          className="mt-3 text-xs underline"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Сбросить отметки
        </button>
      )}

      <p className="mt-6 text-sm rounded-lg px-4 py-3" style={{ background: "var(--color-flag-soft)", color: "var(--color-flag)" }}>
        {result.disclaimer}
      </p>

      <div className="mt-8 flex gap-3 flex-wrap">
        <button onClick={onBack} className="text-sm px-4 py-2 rounded-full" style={{ border: "1px solid var(--color-line)" }}>
          К маршруту
        </button>
        <button
          onClick={onEditProfile}
          className="text-sm px-4 py-2 rounded-full"
          style={{ border: "1px solid var(--color-line)" }}
        >
          Изменить анкету и пересчитать
        </button>
        <Link
          href="/"
          className="text-sm px-4 py-2 rounded-full font-medium"
          style={{ background: "var(--color-ink)", color: "var(--color-paper)" }}
        >
          На главную
        </Link>
      </div>
    </div>
  );
}