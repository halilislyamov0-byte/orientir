// Профиль, который собирает анкета
export interface ApplicantProfile {
  grade: string; // класс, напр. "10"
  interests: string; // свободный текст интересов
  subjects: string; // сильные предметы / успеваемость
  languages: string; // языки и владение
  exams: string; // больше не спрашиваем в анкете — экзамены подбирает ИИ (поле оставлено для совместимости)
  countries: string[]; // интересующие страны
  budget: string; // бюджет на обучение в год
  timeline: string; // когда планирует поступать
  constraints: string; // прочие ограничения (свободный текст)
}

// Одна рекомендованная программа/университет
export interface Recommendation {
  id: string;
  country: string;
  university: string;
  program: string;
  matchScore: number; // 0-100, насколько подходит профилю
  why: string; // объяснение человеческим языком
  costPerYear: string;
  isDemoData: boolean; // true если цифры/факты не проверены и являются демонстрационными
  source?: string; // название источника, если данные реальные
  universityEn?: string; // официальное название на английском (для поиска фото/сайта)
  website?: string; // официальный сайт вуза
  websiteVerified?: boolean; // true, если сайт взят из Wikidata, а не от модели
  imageUrl?: string; // фото кампуса
  imageCredit?: string; // ссылка на страницу файла (лицензия/автор)
}

export interface ComparisonRow {
  criterion: string; // напр. "Стоимость в год"
  values: Record<string, string>; // recommendationId -> значение
  scores?: Record<string, number>; // recommendationId -> 1..5, насколько вариант хорош по этому параметру для ученика
}

export type RoadmapCategory = "exam" | "document" | "deadline" | "activity";

export interface RoadmapStep {
  id: string;
  category: RoadmapCategory;
  title: string;
  description: string;
  dueHint: string; // напр. "за 6 месяцев до подачи"
  done?: boolean;
}

export interface Diagnosis {
  summary: string;
  strengths: string[];
  gaps: string[];
  goal: string;
}

export interface NextAction {
  title: string;
  description: string;
}

// Экзамен, который нужно сдать для поступления (подбирается по странам)
export interface RequiredExam {
  name: string; // напр. "IELTS Academic"
  countries: string[]; // для каких стран из профиля нужен
  purpose: string; // зачем: подтверждение английского, вступительный и т.п.
  targetScore: string; // ориентир по баллу, напр. "6.5+"
  mandatory: boolean; // обязателен или желателен
  when: string; // когда сдавать относительно подачи
}

export interface JourneyResult {
  diagnosis: Diagnosis;
  requiredExams?: RequiredExam[]; // может отсутствовать у маршрутов, построенных раньше
  recommendations: Recommendation[]; // минимум 3
  comparison: ComparisonRow[]; // сравнение по recommendations[0..1] минимум
  roadmap: RoadmapStep[];
  nextAction: NextAction;
  disclaimer: string;
}
