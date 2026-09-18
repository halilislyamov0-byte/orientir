import { NextRequest, NextResponse } from "next/server";
import { generateShortText } from "@/lib/gemini";

// Пояснение к одной строке таблицы сравнения.
export const maxDuration = 60;

const IS_DEV = process.env.NODE_ENV === "development";

interface ExplainBody {
  criterion?: unknown;
  options?: unknown; // [{ university, value }]
  grade?: unknown;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max).trim() : "");

export async function POST(req: NextRequest) {
  let body: ExplainBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const criterion = str(body.criterion, 200);
  const grade = str(body.grade, 10);
  const options = Array.isArray(body.options)
    ? body.options
        .slice(0, 6)
        .map((o: any) => ({ university: str(o?.university, 150), value: str(o?.value, 300) }))
        .filter((o) => o.university)
    : [];

  if (!criterion) {
    return NextResponse.json({ error: "Не указан параметр" }, { status: 400 });
  }

  const list = options.map((o) => `- ${o.university}: ${o.value}`).join("\n");

  const prompt = `Ты — дружелюбный консультант по поступлению. Школьник${grade ? ` ${grade} класса` : ""} смотрит таблицу сравнения вузов.

Параметр: «${criterion}»
Значения:
${list}

Объясни простым языком на русском, 3–4 коротких предложения:
1) что означает этот параметр и почему он важен при выборе;
2) как понимать разницу между вариантами выше и какой выглядит выгоднее.
Если в значениях есть термины (Foundation, IELTS, семестровый сбор и т.п.) — поясни их.
Без markdown, без списков, без приветствия. Не выдумывай новых цифр.`;

  try {
    const text = await generateShortText(prompt);
    return NextResponse.json({ text: text.replace(/[*#_`]/g, "") });
  } catch (err) {
    console.error("[api/explain]", err);
    const message =
      IS_DEV && err instanceof Error ? `[dev] ${err.message}` : "Не удалось получить пояснение, попробуй ещё раз.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}