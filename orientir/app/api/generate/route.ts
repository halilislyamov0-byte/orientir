import { NextRequest, NextResponse } from "next/server";
import { generateJourney } from "@/lib/gemini";
import { enrichRecommendations } from "@/lib/enrich";
import { ApplicantProfile } from "@/lib/types";

// Vercel Hobby обрывает функцию через 60 секунд
export const maxDuration = 60;

// Сообщения для клиента. В продакшене сырой текст ошибки наружу не уходит —
// полная версия со стеком остаётся в console.error на сервере.
const MSG_INCOMPLETE = "Анкета заполнена не полностью";
const MSG_BAD_REQUEST = "Некорректный запрос";
const MSG_NOT_CONFIGURED =
  "Сервис временно недоступен: не настроен доступ к AI. Попробуй позже.";
const MSG_GENERATION_FAILED =
  "Не удалось построить маршрут. Попробуй ещё раз через минуту.";

// ВНИМАНИЕ: различение по тексту сообщения — завязка на формулировки
// из lib/gemini.ts. Если менять там текст ошибки, поправить и здесь.
const NOT_CONFIGURED_MARKER = "GEMINI_API_KEY";

const IS_DEV = process.env.NODE_ENV === "development";

function clientMessage(err: unknown): string {
  // В режиме разработки показываем настоящую причину прямо на странице.
  if (IS_DEV && err instanceof Error) {
    return `[dev] ${err.message}`;
  }
  if (err instanceof Error && err.message.includes(NOT_CONFIGURED_MARKER)) {
    return MSG_NOT_CONFIGURED;
  }
  return MSG_GENERATION_FAILED;
}

export async function POST(req: NextRequest) {
  // Разбор тела — это ошибка ввода, а не сбой сервера.
  let profile: ApplicantProfile;
  try {
    profile = (await req.json()) as ApplicantProfile;
  } catch (err) {
    console.error("[api/generate] некорректное тело запроса:", err);
    return NextResponse.json({ error: MSG_BAD_REQUEST }, { status: 400 });
  }

  if (typeof profile !== "object" || profile === null) {
    return NextResponse.json({ error: MSG_BAD_REQUEST }, { status: 400 });
  }

  if (!profile.grade || !profile.countries?.length) {
    return NextResponse.json({ error: MSG_INCOMPLETE }, { status: 400 });
  }

  try {
    const result = await generateJourney(profile);
    // Фото кампуса и официальный сайт. Сбой здесь не должен ломать маршрут.
    try {
      result.recommendations = await enrichRecommendations(result.recommendations);
    } catch (err) {
      console.error("[api/generate] enrich:", err);
    }
    return NextResponse.json(result);
  } catch (err) {
    // Полная ошибка — в серверный лог.
    console.error("[api/generate]", err);
    return NextResponse.json({ error: clientMessage(err) }, { status: 500 });
  }
}