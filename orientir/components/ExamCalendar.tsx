"use client";

import { createElement, useEffect, useMemo, useState } from "react";
import { EXAM_EVENTS, ExamEvent, KIND_LABEL, ROLLING_EXAMS, RollingExam, examColor } from "@/lib/examDates";
import { loadProfile } from "@/lib/storage";

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const MONTH_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function todayStr() {
  const t = new Date();
  return ymd(t.getFullYear(), t.getMonth(), t.getDate());
}

function human(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${MONTH_GEN[m - 1]} ${y}`;
}

function humanRange(e: ExamEvent) {
  if (!e.end) return human(e.start);
  const [y1, m1, d1] = e.start.split("-").map(Number);
  const [y2, m2, d2] = e.end.split("-").map(Number);
  if (y1 === y2 && m1 === m2) return `${d1}–${d2} ${MONTH_GEN[m2 - 1]} ${y2}`;
  if (y1 === y2) return `${d1} ${MONTH_GEN[m1 - 1]} – ${d2} ${MONTH_GEN[m2 - 1]} ${y2}`;
  return `${human(e.start)} – ${human(e.end)}`;
}

function daysBetween(from: string, to: string) {
  const a = new Date(from + "T00:00:00");
  const b = new Date(to + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function covers(e: ExamEvent, day: string) {
  return e.end ? e.start <= day && day <= e.end : e.start === day;
}

// Ссылка в новой вкладке (createElement — чтобы код не ломался при копировании из чата)
function ExternalLink({ href, children, className, style }: {
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return createElement("a", { href, target: "_blank", rel: "noopener noreferrer", className, style }, children);
}

export default function ExamCalendar() {
  const [today, setToday] = useState<string>("");
  const [cursor, setCursor] = useState<{ y: number; m: number }>({ y: 2026, m: 8 });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [activeExams, setActiveExams] = useState<string[]>([]); // пусто = все
  const [myCountries, setMyCountries] = useState<string[]>([]);
  const [onlyMine, setOnlyMine] = useState(false);

  // Дата и профиль известны только в браузере
  useEffect(() => {
    const t = todayStr();
    setToday(t);
    const [y, m] = t.split("-").map(Number);
    setCursor({ y, m: m - 1 });
    const p = loadProfile();
    const countries = p?.countries?.length ? p.countries : [];
    if (countries.length) {
      setMyCountries(countries);
      setOnlyMine(true);
    }
  }, []);

  const allEvents = EXAM_EVENTS;

  const examNames = useMemo(() => Array.from(new Set(allEvents.map((e) => e.exam))), [allEvents]);

  // Какие экзамены вообще есть для выбранных стран — остальные показываем бледными
  const availableExams = useMemo(() => {
    if (!onlyMine || myCountries.length === 0) return new Set(examNames);
    return new Set(
      allEvents.filter((e) => e.countries.some((c) => myCountries.includes(c))).map((e) => e.exam)
    );
  }, [allEvents, examNames, onlyMine, myCountries]);

  // Экзамены без фиксированных дат — под выбранные страны
  const rolling = useMemo(() => {
    return ROLLING_EXAMS.filter((r) => {
      if (r.countries === "all") return true;
      if (!onlyMine || myCountries.length === 0) return true;
      return r.countries.some((c) => myCountries.includes(c));
    });
  }, [onlyMine, myCountries]);

  const events = useMemo(() => {
    return allEvents.filter((e) => {
      if (activeExams.length && !activeExams.includes(e.exam)) return false;
      if (onlyMine && myCountries.length && !e.countries.some((c) => myCountries.includes(c))) return false;
      return true;
    });
  }, [allEvents, activeExams, onlyMine, myCountries]);

  // Ближайшие: идущие сейчас или будущие
  const upcoming = useMemo(() => {
    if (!today) return [];
    return events
      .filter((e) => (e.end ?? e.start) >= today)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 6);
  }, [events, today]);

  // Сетка месяца, неделя с понедельника
  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const list: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(ymd(cursor.y, cursor.m, d));
    while (list.length % 7) list.push(null);
    return list;
  }, [cursor]);

  const monthHasEvents = useMemo(
    () => cells.some((d) => d && events.some((e) => covers(e, d))),
    [cells, events]
  );

  const selectedEvents = selectedDay ? events.filter((e) => covers(e, selectedDay)) : [];

  function shiftMonth(delta: number) {
    setSelectedDay(null);
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  function jumpTo(date: string) {
    const [y, m] = date.split("-").map(Number);
    setCursor({ y, m: m - 1 });
    setSelectedDay(date);
  }

  function toggleExam(name: string) {
    setSelectedDay(null);
    setActiveExams((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  }

  return (
    <section
      id="calendar"
      className="mx-auto max-w-6xl px-4 sm:px-6 py-12 md:py-16"
      style={{ borderTop: "1px solid var(--color-line)" }}
    >
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl mb-1">Календарь важных дат</h2>
          <p className="text-sm max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
            Запись на экзамены, дни тестов и приём заявок. Нажми на день, чтобы увидеть события.
          </p>
        </div>
        {myCountries.length > 0 && (
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => {
                setOnlyMine(e.target.checked);
                setSelectedDay(null);
              }}
            />
            Только мои страны ({myCountries.join(", ")})
          </label>
        )}
      </div>

      {/* Фильтр по экзаменам: на телефоне — лента с прокруткой */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => {
            setActiveExams([]);
            setSelectedDay(null);
          }}
          className="rounded-full px-3 py-1.5 text-sm shrink-0"
          style={{
            background: activeExams.length === 0 ? "var(--color-ink)" : "white",
            color: activeExams.length === 0 ? "var(--color-paper)" : "var(--color-ink)",
            border: "1px solid " + (activeExams.length === 0 ? "var(--color-ink)" : "var(--color-line)"),
          }}
        >
          Все
        </button>
        {examNames.map((name) => {
          const active = activeExams.includes(name);
          const color = examColor(name);
          const available = availableExams.has(name);
          return (
            <button
              type="button"
              key={name}
              aria-pressed={active}
              onClick={() => toggleExam(name)}
              title={available ? undefined : "Нет дат для выбранных стран — сними галочку «Только мои страны»"}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm shrink-0"
              style={{
                background: active ? color : "white",
                color: active ? "white" : "var(--color-ink)",
                border: `1px solid ${active ? color : "var(--color-line)"}`,
                opacity: available ? 1 : 0.45,
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: active ? "white" : color }} />
              {name}
            </button>
          );
        })}
      </div>

      {events.length === 0 && (
        <p
          className="mb-6 text-sm rounded-lg px-4 py-3"
          style={{ background: "var(--color-flag-soft)", color: "var(--color-flag)" }}
        >
          По текущим фильтрам событий нет.{" "}
          {onlyMine && myCountries.length > 0 && (
            <button type="button" className="underline" onClick={() => setOnlyMine(false)}>
              Показать все страны
            </button>
          )}{" "}
          {activeExams.length > 0 && (
            <button type="button" className="underline" onClick={() => setActiveExams([])}>
              Сбросить выбор экзаменов
            </button>
          )}
        </p>
      )}

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        {/* Месяц */}
        <div
          className="rounded-2xl p-3 sm:p-5"
          style={{ background: "var(--color-paper-raised)", border: "1px solid var(--color-line)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Предыдущий месяц"
              className="w-8 h-8 rounded-full hover:bg-black/5"
              style={{ border: "1px solid var(--color-line)" }}
            >
              ‹
            </button>
            <div className="text-base font-medium" style={{ fontFamily: "var(--font-display)" }}>
              {MONTH_NAMES[cursor.m]} {cursor.y}
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Следующий месяц"
              className="w-8 h-8 rounded-full hover:bg-black/5"
              style={{ border: "1px solid var(--color-line)" }}
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1" style={{ color: "var(--color-ink-soft)" }}>
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const dayEvents = events.filter((e) => covers(e, day));
              const inRange = dayEvents.some((e) => e.end);
              const dots = dayEvents.filter((e) => !e.end || e.start === day || e.end === day);
              const isToday = day === today;
              const isSelected = day === selectedDay;
              const clickable = dayEvents.length > 0;
              return (
                <button
                  type="button"
                  key={day}
                  disabled={!clickable}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className="h-11 sm:h-12 rounded-lg flex flex-col items-center justify-center gap-1 text-sm transition-colors"
                  style={{
                    background: isSelected
                      ? "var(--color-ink)"
                      : inRange
                        ? "var(--color-accent-soft)"
                        : "transparent",
                    color: isSelected ? "var(--color-paper)" : "var(--color-ink)",
                    border: isToday ? "1.5px solid var(--color-signal)" : "1px solid transparent",
                    cursor: clickable ? "pointer" : "default",
                    opacity: clickable || isToday ? 1 : 0.55,
                  }}
                >
                  <span className={clickable ? "font-medium" : ""}>{Number(day.slice(8))}</span>
                  <span className="flex gap-0.5 h-1.5">
                    {dots.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: isSelected ? "white" : examColor(e.exam) }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          {!monthHasEvents && (
            <p className="mt-4 text-sm text-center" style={{ color: "var(--color-ink-soft)" }}>
              В этом месяце событий нет — полистай вперёд.
            </p>
          )}

          {selectedDay && (
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--color-line)" }}>
              <p className="text-sm font-medium mb-2">{human(selectedDay)}</p>
              <div className="space-y-2">
                {selectedEvents.map((e) => (
                  <EventCard key={e.id} e={e} today={today} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ближайшие */}
        <div>
          <h3 className="text-base mb-3">Ближайшие даты</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
              По выбранным фильтрам ближайших событий нет. Сними галочку «Только мои страны» или нажми «Все» над календарём.
            </p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((e) => (
                <EventCard key={e.id} e={e} today={today} onJump={() => jumpTo(e.start < today ? today : e.start)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {rolling.length > 0 && (
        <div className="mt-8">
          <h3 className="text-base mb-1">Экзамены без фиксированных дат</h3>
          <p className="text-sm mb-3" style={{ color: "var(--color-ink-soft)" }}>
            Их можно сдать почти в любую неделю — записывайся заранее, места разбирают.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rolling.map((r) => (
              <RollingCard key={r.name} r={r} />
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs" style={{ color: "var(--color-ink-soft)" }}>
        Даты сверены с официальными сайтами в сентябре 2026. Пометка «ориентировочно» — срок ещё не объявлен и указан по
        прошлогоднему графику. Перед записью всегда проверяй дату на официальном сайте экзамена.
      </p>
    </section>
  );
}

function RollingCard({ r }: { r: RollingExam }) {
  const color = examColor(r.name);
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: "var(--color-paper-raised)", border: "1px solid var(--color-line)" }}
    >
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="text-[11px] rounded-full px-2 py-0.5 text-white" style={{ background: color }}>
          {r.name}
        </span>
        <span className="text-[11px]" style={{ color: "var(--color-ink-soft)" }}>
          {r.countries === "all" ? "любая страна" : r.countries.join(", ")}
        </span>
      </div>
      <p className="text-sm leading-snug">{r.note}</p>
      <ExternalLink href={r.url} className="mt-1.5 inline-block text-xs underline" style={{ color: "var(--color-accent)" }}>
        Записаться ↗
      </ExternalLink>
    </div>
  );
}

function EventCard({ e, today, onJump }: { e: ExamEvent; today: string; onJump?: () => void }) {
  const color = examColor(e.exam);
  const ongoing = e.end && today && e.start <= today && today <= e.end;
  const left = today ? daysBetween(today, e.start) : null;

  let when = "";
  if (ongoing) when = `идёт сейчас, до ${human(e.end!)}`;
  else if (left === 0) when = "сегодня";
  else if (left === 1) when = "завтра";
  else if (left !== null && left > 0) when = `через ${left} дн.`;

  return (
    <div
      className="rounded-xl p-3 flex gap-3"
      style={{ background: "var(--color-paper-raised)", border: "1px solid var(--color-line)" }}
    >
      <span className="w-1 rounded-full shrink-0" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] mb-1">
          <span className="rounded-full px-2 py-0.5 text-white" style={{ background: color }}>{e.exam}</span>
          <span className="rounded-full px-2 py-0.5" style={{ background: "var(--color-line)", color: "var(--color-ink)" }}>
            {KIND_LABEL[e.kind]}
          </span>
          {e.estimated && (
            <span className="rounded-full px-2 py-0.5" style={{ background: "var(--color-signal-soft)", color: "#8a5115" }}>
              ориентировочно
            </span>
          )}
          {when && (
            <span className="font-medium" style={{ color: ongoing ? "var(--color-progress)" : "var(--color-flag)" }}>
              {when}
            </span>
          )}
        </div>
        <p className="text-sm font-medium leading-snug">{e.title}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-soft)" }}>
          {humanRange(e)} · {e.countries.join(", ")}
        </p>
        {e.note && (
          <p className="text-xs mt-1" style={{ color: "var(--color-ink-soft)" }}>
            {e.note}
          </p>
        )}
        <div className="mt-1.5 flex gap-3 text-xs">
          {onJump && (
            <button type="button" onClick={onJump} className="underline" style={{ color: "var(--color-ink)" }}>
              Показать в календаре
            </button>
          )}
          <ExternalLink href={e.url} className="underline" style={{ color: "var(--color-accent)" }}>
            Официальный сайт ↗
          </ExternalLink>
        </div>
      </div>
    </div>
  );
}