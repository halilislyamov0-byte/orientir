"use client";

import { createElement } from "react";
import { useRouter } from "next/navigation";
import ExamCalendar from "@/components/ExamCalendar";

const STOPS = [
  { n: 1, title: "Профиль", sub: "короткая анкета о тебе", start: true },
  { n: 2, title: "Диагностика", sub: "сильные стороны и цель" },
  { n: 3, title: "Рекомендации", sub: "программы с объяснением" },
  { n: 4, title: "Сравнение", sub: "варианты бок о бок" },
  { n: 5, title: "Маршрут", sub: "план до подачи документов" },
  { n: 6, title: "Первый шаг", sub: "что сделать прямо сейчас" },
];

export default function Home() {
  const router = useRouter();
  // ?new=1 — анкета открывается заново, даже если маршрут уже построен
  const openJourney = () => router.push("/journey?new=1");

  return (
    <main className="min-h-screen">
      <header className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
        <span className="font-hero text-lg" style={{ color: "var(--color-ink)" }}>
          Ориентир
        </span>
        <nav className="flex items-center gap-5">
          <button type="button" onClick={scrollToCalendar} className="hidden sm:inline text-sm link-quiet">
            Календарь дат
          </button>
          <button type="button" onClick={scrollToHow} className="hidden sm:inline text-sm link-quiet">
            Как это работает
          </button>
          <button type="button" onClick={openJourney} className="btn-primary text-sm font-medium rounded-full px-5 py-2.5">
            Построить маршрут
          </button>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-16 md:pt-16 md:pb-24">
        <div className="grid md:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
          <div>
            <span className="inline-flex items-center rounded-full px-3 py-1 text-sm" style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
              Для 9–11 класса · поступление в разные страны
            </span>
            <h1 className="font-hero text-4xl sm:text-5xl leading-[1.08] mt-6">
              Не ещё один список вузов, а маршрут до поступления
            </h1>
            <p className="mt-6 text-lg leading-relaxed max-w-md" style={{ color: "var(--color-ink-soft)" }}>
              Ответь на короткую анкету — получи диагностику профиля, подходящие программы в разных странах, сравнение вариантов и пошаговый план до подачи документов.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button type="button" onClick={openJourney} className="btn-primary inline-flex items-center rounded-full px-7 py-3.5 text-base font-medium">
                Построить мой маршрут
              </button>
              <button type="button" onClick={scrollToCalendar} className="btn-ghost inline-flex items-center rounded-full px-6 py-3.5 text-base font-medium">
                Календарь дат
              </button>
            </div>
            <p className="mt-4 text-sm" style={{ color: "var(--color-ink-soft)" }}>
              3–4 минуты · без регистрации · меняешь ответы — меняется маршрут
            </p>
          </div>

          <div className="rounded-2xl p-6 sm:p-7" style={{ background: "var(--color-paper-raised)", border: "1px solid var(--color-line)", boxShadow: "0 1px 2px rgba(23,33,58,0.04), 0 12px 32px rgba(23,33,58,0.06)" }}>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="text-lg">Твой маршрут</h2>
              <span className="text-sm" style={{ color: "var(--color-ink-soft)" }}>6 шагов</span>
            </div>
            <ol>
              {STOPS.map((s, i) => {
                const last = i === STOPS.length - 1;
                return (
                  <li key={s.n} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="relative flex items-center justify-center shrink-0">
                        {s.start && (
                          <span className="pin-pulse absolute inline-block w-7 h-7 rounded-full" style={{ background: "var(--color-signal)" }} aria-hidden />
                        )}
                        <span className="relative w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: s.start ? "var(--color-signal)" : "#fff", color: s.start ? "#fff" : "var(--color-ink-soft)", border: `1.5px solid ${s.start ? "var(--color-signal)" : "var(--color-line)"}` }}>
                          {s.n}
                        </span>
                      </span>
                      {!last && (
                        <span className="w-0.5 flex-1 my-1.5" style={{ background: "var(--color-line)", minHeight: "18px" }} />
                      )}
                    </div>
                    <div className={last ? "" : "pb-4"}>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-medium" style={{ fontFamily: "var(--font-display)" }}>{s.title}</span>
                        {s.start && (
                          <span className="text-xs rounded-full px-2 py-0.5" style={{ background: "var(--color-signal-soft)", color: "#8a5115" }}>старт</span>
                        )}
                      </div>
                      <p className="text-sm mt-0.5" style={{ color: "var(--color-ink-soft)" }}>{s.sub}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      <ExamCalendar />

      <section id="how" className="mx-auto max-w-6xl px-6 py-14 md:py-16" style={{ borderTop: "1px solid var(--color-line)" }}>
        <h2 className="text-2xl mb-10">Почему это маршрут, а не список</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          <div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
              <DotIcon />
            </div>
            <h3 className="text-base mb-2">Объясняет выбор</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              Каждая рекомендация идёт с понятной причиной, почему подходит именно тебе — а не просто строкой в списке.
            </p>
          </div>
          <div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--color-progress-soft)", color: "var(--color-progress)" }}>
              <ArrowsIcon />
            </div>
            <h3 className="text-base mb-2">Реагирует на тебя</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              Поменяешь бюджет, страну или экзамен — рекомендации и план заметно пересчитываются под новые вводные.
            </p>
          </div>
          <div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--color-signal-soft)", color: "#8a5115" }}>
              <CheckIcon />
            </div>
            <h3 className="text-base mb-2">Честно с данными</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              Ориентировочные цифры и дедлайны помечены как демонстрационные. Никаких выдуманных гарантий поступления.
            </p>
          </div>
        </div>
        <div className="mt-12">
          <button type="button" onClick={openJourney} className="btn-primary inline-flex items-center rounded-full px-7 py-3.5 text-base font-medium">
            Начать с анкеты
          </button>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-sm" style={{ borderTop: "1px solid var(--color-line)", color: "var(--color-ink-soft)" }}>
        Ориентир · демо-проект для LOCUS Hackathon 2026
      </footer>
    </main>
  );
}

function scrollToHow() {
  document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
}

function scrollToCalendar() {
  document.getElementById("calendar")?.scrollIntoView({ behavior: "smooth" });
}

// Иконки собраны через createElement — чтобы код не ломался при копировании из чата.
const h = createElement;
const stroke = { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Icon({ children }: { children: React.ReactNode }) {
  return h("svg", { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none" }, children);
}

function DotIcon() {
  return (
    <Icon>
      {h("circle", { cx: 10, cy: 10, r: 7, stroke: "currentColor", strokeWidth: 1.6 })}
      {h("circle", { cx: 10, cy: 10, r: 2.5, fill: "currentColor" })}
    </Icon>
  );
}

function ArrowsIcon() {
  return (
    <Icon>
      {h("path", { d: "M6 7h9M12 4l3 3-3 3", strokeWidth: 1.6, ...stroke })}
      {h("path", { d: "M14 13H5M8 16l-3-3 3-3", strokeWidth: 1.6, ...stroke })}
    </Icon>
  );
}

function CheckIcon() {
  return (
    <Icon>
      {h("path", { d: "M4 10.5l3.5 3.5L16 6", strokeWidth: 1.8, ...stroke })}
    </Icon>
  );
}
