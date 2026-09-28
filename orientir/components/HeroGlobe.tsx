'use client';

// First screen of orientir: dark space hero with the 3D Earth.
// Text sits over the canvas with pointer-events disabled, so the globe
// can be dragged anywhere; only the buttons are clickable.
import dynamic from 'next/dynamic';
import { Space_Grotesk } from 'next/font/google';

const EarthGlobe = dynamic(() => import('./EarthGlobe'), { ssr: false });
const grotesk = Space_Grotesk({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'] });

type Props = {
  /** Where the main button leads, e.g. "#start" (the questionnaire block). */
  startHref?: string;
};

export default function HeroGlobe({ startHref = '#start' }: Props) {
  return (
    <section
      className={`${grotesk.className} relative h-[100dvh] min-h-[560px] w-full overflow-hidden bg-[#01030a] text-[#eef2f6]`}
    >
      <EarthGlobe />

      <div className="pointer-events-none relative z-10 flex h-full flex-col px-5 pt-[max(22px,env(safe-area-inset-top))] sm:px-11">
        <nav className="flex items-center justify-between">
          <span className="text-[15px] font-semibold tracking-wide">
            orientir<span className="text-[#8fb8e8]">®</span>
          </span>
        </nav>

        <div className="mt-[13vh] max-w-[640px]">
          <span className="mb-5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#8b95a3]">
            <span className="h-[7px] w-[7px] rounded-full bg-[#8fb8e8] shadow-[0_0_12px_#8fb8e8]" />
            маршрут в университет
          </span>
          <h1
            className="m-0 text-[clamp(56px,13vw,168px)] font-bold leading-[0.92] tracking-[-0.03em]"
            style={{ fontFamily: grotesk.style.fontFamily }}
          >
            orientir
            <span className="bg-gradient-to-r from-[#8fb8e8] to-[#ff4fa3] bg-clip-text align-super text-[0.4em] text-transparent">
              ®
            </span>
          </h1>
          <p className="mt-6 max-w-[420px] text-[clamp(14px,1.6vw,17px)] leading-relaxed text-[#8b95a3]">
            Персональный маршрут поступления — от твоих оценок до конкретного вуза, где угодно в мире.
            Зажми и потяни Землю, нажми на точку — увидишь университет.
          </p>
          <div className="pointer-events-auto mt-8 flex flex-wrap gap-3">
            <a
              href={startHref}
              className="rounded-full bg-[#eef2f6] px-6 py-3.5 text-sm font-semibold text-[#0a0c10] transition hover:shadow-[0_0_30px_rgba(143,184,232,.45)]"
            >
              Построить маршрут →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
