// Важные даты для календаря на главной.
// Данные собраны из официальных расписаний и проверены в сентябре 2026.
// estimated: true — дата ещё не объявлена официально и указана по прошлогоднему графику.

export type ExamEventKind = "registration" | "deadline" | "exam" | "results" | "application";

export interface ExamEvent {
  id: string;
  exam: string; // короткое имя для фильтра
  title: string;
  kind: ExamEventKind;
  start: string; // YYYY-MM-DD
  end?: string; // YYYY-MM-DD, для периодов
  countries: string[];
  url: string;
  note?: string;
  estimated?: boolean;
}

export const EXAM_COLORS: Record<string, string> = {
  SAT: "#2f5ccc",
  TOPIK: "#b4442e",
  EJU: "#8a4fbf",
  JLPT: "#c2417a",
  "ЕНТ": "#2f6f62",
  "Türkiye Bursları": "#e08a2b",
  "uni-assist": "#4b5563",
};

// Цвет для экзаменов, которых нет в списке выше
const EXTRA_COLORS = ["#0f766e", "#9333ea", "#be123c", "#1d4ed8", "#a16207", "#15803d", "#7c2d12"];
export function examColor(name: string): string {
  if (EXAM_COLORS[name]) return EXAM_COLORS[name];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return EXTRA_COLORS[h % EXTRA_COLORS.length];
}

export const KIND_LABEL: Record<ExamEventKind, string> = {
  registration: "Регистрация",
  deadline: "Дедлайн записи",
  exam: "Экзамен",
  results: "Результаты",
  application: "Подача заявок",
};

const SAT_URL = "https://satsuite.collegeboard.org/sat/dates-deadlines";
const SAT_COUNTRIES = ["США", "ОАЭ", "Турция", "Казахстан"];

function sat(date: string, deadline: string, label: string): ExamEvent[] {
  return [
    {
      id: `sat-dl-${date}`,
      exam: "SAT",
      title: `Последний день записи на SAT ${label}`,
      kind: "deadline",
      start: deadline,
      countries: SAT_COUNTRIES,
      url: SAT_URL,
      note: "Популярные центры заполняются раньше — записывайся за 5–6 недель.",
    },
    {
      id: `sat-${date}`,
      exam: "SAT",
      title: `SAT ${label}`,
      kind: "exam",
      start: date,
      countries: SAT_COUNTRIES,
      url: SAT_URL,
    },
  ];
}

// Экзамены без фиксированного расписания: их сдают почти в любую неделю,
// поэтому в календаре им нет места — показываем отдельным списком.
export interface RollingExam {
  name: string;
  countries: string[] | "all";
  note: string;
  url: string;
}

export const ROLLING_EXAMS: RollingExam[] = [
  {
    name: "IELTS Academic",
    countries: "all",
    note: "Сессии почти каждую неделю. Записывайся за 3–5 недель, результат через 3–13 дней.",
    url: "https://www.ielts.org/book-a-test",
  },
  {
    name: "TOEFL iBT",
    countries: "all",
    note: "Проводится больше 60 раз в год, есть домашний формат. Результат примерно через неделю.",
    url: "https://www.ets.org/toefl",
  },
  {
    name: "Duolingo English Test",
    countries: "all",
    note: "Сдают дома в любое время, результат за 2 дня. Принимают не все вузы — проверь список.",
    url: "https://englishtest.duolingo.com",
  },
  {
    name: "HSK 1–6",
    countries: ["Китай"],
    note: "Сессии почти каждый месяц. Регистрация закрывается за 10 дней (на компьютере) или 27 дней (на бумаге).",
    url: "https://www.chinesetest.cn",
  },
  {
    name: "YÖS",
    countries: ["Турция"],
    note: "Каждый вуз проводит свой экзамен весной, даты и приём заявок смотри на сайте вуза.",
    url: "https://www.studyinturkiye.gov.tr",
  },
  {
    name: "ACT",
    countries: ["США", "ОАЭ", "Казахстан"],
    note: "6–7 дат в год, регистрация примерно за 5 недель. Многие вузы принимают ACT вместо SAT.",
    url: "https://www.act.org/content/act/en/products-and-services/the-act/registration.html",
  },
  {
    name: "IELTS UKVI",
    countries: ["Великобритания"],
    note: "Отдельный формат для студенческой визы. Проверь, требует ли его вуз.",
    url: "https://www.ielts.org/book-a-test",
  },
  {
    name: "Goethe-Zertifikat / telc",
    countries: ["Германия", "Австрия", "Швейцария"],
    note: "Экзамены по немецкому проводят по расписанию местного центра, обычно раз в месяц.",
    url: "https://www.goethe.de",
  },
  {
    name: "DELF / DALF",
    countries: ["Франция", "Бельгия", "Канада"],
    note: "Сессии несколько раз в год в Альянс Франсез, запись за 1–2 месяца.",
    url: "https://www.france-education-international.fr",
  },
  {
    name: "DELE / SIELE",
    countries: ["Испания", "Мексика", "Аргентина"],
    note: "DELE — несколько дат в год, SIELE можно сдать почти в любой день.",
    url: "https://examenes.cervantes.es",
  },
  {
    name: "TOPIK",
    countries: ["Южная Корея"],
    note: "Сессии несколько раз в год, за рубежом регистрацию открывает местный центр.",
    url: "https://www.topik.go.kr",
  },
  {
    name: "EmSAT",
    countries: ["ОАЭ"],
    note: "Экзамен для поступления в государственные вузы ОАЭ, сессии в течение года.",
    url: "https://emsat.moe.gov.ae",
  },
];

export const EXAM_EVENTS: ExamEvent[] = [
  // SAT (College Board), цикл 2026–27
  {
    id: "sat-late-oct",
    exam: "SAT",
    title: "Поздняя запись на SAT 3 октября (с доплатой)",
    kind: "deadline",
    start: "2026-09-22",
    countries: SAT_COUNTRIES,
    url: SAT_URL,
  },
  ...sat("2026-10-03", "2026-09-18", "3 октября"),
  ...sat("2026-11-07", "2026-10-23", "7 ноября"),
  ...sat("2026-12-05", "2026-11-20", "5 декабря"),
  ...sat("2027-03-06", "2027-02-19", "6 марта"),
  ...sat("2027-05-01", "2027-04-16", "1 мая"),
  ...sat("2027-06-05", "2027-05-21", "5 июня"),

  // TOPIK (Южная Корея)
  {
    id: "topik-108",
    exam: "TOPIK",
    title: "108-й TOPIK",
    kind: "exam",
    start: "2026-10-18",
    countries: ["Южная Корея"],
    url: "https://www.topik.go.kr",
    note: "За рубежом регистрация идёт через местный центр — сроки уточняй в посольстве или Корейском центре.",
  },
  {
    id: "topik-109",
    exam: "TOPIK",
    title: "109-й TOPIK (в Корее и части стран)",
    kind: "exam",
    start: "2026-11-15",
    countries: ["Южная Корея"],
    url: "https://www.topik.go.kr",
  },
  {
    id: "topik-108-res",
    exam: "TOPIK",
    title: "Результаты 108-го TOPIK",
    kind: "results",
    start: "2026-12-10",
    countries: ["Южная Корея"],
    url: "https://www.topik.go.kr",
  },

  // EJU (Япония)
  {
    id: "eju-2026-2",
    exam: "EJU",
    title: "EJU, 2-я сессия",
    kind: "exam",
    start: "2026-11-08",
    countries: ["Япония"],
    url: "https://www.jasso.go.jp/en/ryugaku/eju/",
  },
  {
    id: "eju-2026-2-res",
    exam: "EJU",
    title: "Результаты EJU (2-я сессия)",
    kind: "results",
    start: "2026-12-15",
    countries: ["Япония"],
    url: "https://www.jasso.go.jp/en/ryugaku/eju/",
  },
  {
    id: "eju-2027-1-reg",
    exam: "EJU",
    title: "Приём заявок на EJU, 1-я сессия 2027",
    kind: "registration",
    start: "2027-02-15",
    end: "2027-03-12",
    countries: ["Япония"],
    url: "https://www.jasso.go.jp/en/ryugaku/eju/",
    estimated: true,
  },

  // JLPT (Япония)
  {
    id: "jlpt-2026-12",
    exam: "JLPT",
    title: "JLPT (декабрьская сессия)",
    kind: "exam",
    start: "2026-12-06",
    countries: ["Япония"],
    url: "https://www.jlpt.jp/e/",
  },
  {
    id: "jlpt-2027-reg",
    exam: "JLPT",
    title: "Регистрация на июльский JLPT",
    kind: "registration",
    start: "2027-03-15",
    end: "2027-04-15",
    countries: ["Япония"],
    url: "https://www.jlpt.jp/e/",
    note: "Точные сроки назначает местный центр, места заканчиваются быстро.",
    estimated: true,
  },
  {
    id: "jlpt-2027-07",
    exam: "JLPT",
    title: "JLPT (июльская сессия)",
    kind: "exam",
    start: "2027-07-04",
    countries: ["Япония"],
    url: "https://www.jlpt.jp/e/",
    estimated: true,
  },

  // ЕНТ (Казахстан)
  {
    id: "ent-jan-reg",
    exam: "ЕНТ",
    title: "Приём заявок на январское ЕНТ",
    kind: "registration",
    start: "2026-12-22",
    end: "2026-12-30",
    countries: ["Казахстан"],
    url: "https://app.testcenter.kz",
    note: "Подать заявку можно на app.testcenter.kz или в приложении UTO.",
    estimated: true,
  },
  {
    id: "ent-jan",
    exam: "ЕНТ",
    title: "Январское ЕНТ",
    kind: "exam",
    start: "2027-01-10",
    end: "2027-02-10",
    countries: ["Казахстан"],
    url: "https://testcenter.kz",
    estimated: true,
  },
  {
    id: "ent-main",
    exam: "ЕНТ",
    title: "Основное ЕНТ (две попытки)",
    kind: "exam",
    start: "2027-05-10",
    end: "2027-07-10",
    countries: ["Казахстан"],
    url: "https://testcenter.kz",
    estimated: true,
  },

  // Türkiye Bursları (Турция)
  {
    id: "tb-2027",
    exam: "Türkiye Bursları",
    title: "Приём заявок на стипендию Türkiye Bursları",
    kind: "application",
    start: "2027-01-10",
    end: "2027-02-20",
    countries: ["Турция"],
    url: "https://www.turkiyeburslari.gov.tr/calendar",
    note: "Портал перегружен в последние дни — подавай заранее.",
    estimated: true,
  },

  // Великобритания (UCAS)
  {
    id: "ucas-oct",
    exam: "UCAS",
    title: "Дедлайн UCAS: Оксфорд, Кембридж, медицина, стоматология, ветеринария",
    kind: "deadline",
    start: "2026-10-15",
    countries: ["Великобритания"],
    url: "https://www.ucas.com/undergraduate/applying-university/dates-and-deadlines-undergraduate-applications",
    note: "До 18:00 по британскому времени.",
  },
  {
    id: "ucas-jan",
    exam: "UCAS",
    title: "Главный дедлайн UCAS (равное рассмотрение заявок)",
    kind: "deadline",
    start: "2027-01-13",
    countries: ["Великобритания"],
    url: "https://www.ucas.com/undergraduate/applying-university/dates-and-deadlines-undergraduate-applications",
    note: "Заявки после этой даты вузы рассматривают по своему усмотрению.",
  },
  {
    id: "ucas-june",
    exam: "UCAS",
    title: "Последний день подать заявку до Clearing",
    kind: "deadline",
    start: "2027-06-30",
    countries: ["Великобритания"],
    url: "https://www.ucas.com/undergraduate/applying-university/dates-and-deadlines-undergraduate-applications",
    estimated: true,
  },

  // США (Common App)
  {
    id: "us-ed",
    exam: "Common App",
    title: "Early Decision / Early Action во многих вузах США",
    kind: "deadline",
    start: "2026-11-01",
    countries: ["США"],
    url: "https://www.commonapp.org/apply/deadlines",
    note: "Точную дату смотри на странице вуза — она у каждого своя.",
    estimated: true,
  },
  {
    id: "us-rd",
    exam: "Common App",
    title: "Regular Decision во многих вузах США",
    kind: "deadline",
    start: "2027-01-01",
    countries: ["США"],
    url: "https://www.commonapp.org/apply/deadlines",
    note: "У части вузов дедлайн 5 или 15 января — проверь на сайте.",
    estimated: true,
  },

  // Китай
  {
    id: "hsk79-nov",
    exam: "HSK",
    title: "HSK 7–9 (продвинутый уровень)",
    kind: "exam",
    start: "2026-11-22",
    countries: ["Китай"],
    url: "https://www.chinesetest.cn",
    note: "HSK 7–9 проводят дважды в год, регистрация закрывается за 10–14 дней.",
    estimated: true,
  },
  {
    id: "csc-2027",
    exam: "CSC",
    title: "Приём заявок на стипендию правительства Китая (CSC)",
    kind: "application",
    start: "2027-01-10",
    end: "2027-04-10",
    countries: ["Китай"],
    url: "https://www.campuschina.org",
    note: "Сроки зависят от вуза и посольства, начинаются в январе.",
    estimated: true,
  },

  // Южная Корея
  {
    id: "gks-2027",
    exam: "GKS",
    title: "Приём заявок на стипендию GKS (бакалавриат)",
    kind: "application",
    start: "2027-02-01",
    end: "2027-03-15",
    countries: ["Южная Корея"],
    url: "https://www.studyinkorea.go.kr",
    note: "Через посольство сроки обычно раньше, чем через вуз.",
    estimated: true,
  },

  // Нидерланды
  {
    id: "nl-studielink",
    exam: "Studielink",
    title: "Дедлайн подачи заявки на бакалавриат (большинство вузов)",
    kind: "deadline",
    start: "2027-05-01",
    countries: ["Нидерланды"],
    url: "https://www.studielink.nl/en",
    note: "У программ с отбором (numerus fixus) дедлайн 15 января.",
    estimated: true,
  },

  // Франция
  {
    id: "fr-ef",
    exam: "Études en France",
    title: "Приём заявок для иностранцев (процедура Études en France)",
    kind: "application",
    start: "2026-10-01",
    end: "2026-12-05",
    countries: ["Франция"],
    url: "https://www.campusfrance.org",
    estimated: true,
  },

  // Италия
  {
    id: "it-preiscrizione",
    exam: "Universitaly",
    title: "Предварительная запись иностранцев (pre-enrolment)",
    kind: "application",
    start: "2027-03-01",
    end: "2027-06-30",
    countries: ["Италия"],
    url: "https://www.universitaly.it",
    estimated: true,
  },

  // Канада
  {
    id: "ca-ouac",
    exam: "OUAC",
    title: "Дедлайн подачи в вузы Онтарио (OUAC)",
    kind: "deadline",
    start: "2027-01-15",
    countries: ["Канада"],
    url: "https://www.ouac.on.ca",
    note: "В других провинциях свои сроки, обычно январь–март.",
    estimated: true,
  },

  // Германия
  {
    id: "testas-2027",
    exam: "TestAS",
    title: "TestAS (проверка академических способностей)",
    kind: "exam",
    start: "2027-02-20",
    countries: ["Германия"],
    url: "https://www.testas.de",
    note: "Проводится несколько раз в год, регистрация за 6–8 недель.",
    estimated: true,
  },
  {
    id: "ua-summer-2027",
    exam: "uni-assist",
    title: "Дедлайн подачи на летний семестр 2027 (многие вузы)",
    kind: "deadline",
    start: "2027-01-15",
    countries: ["Германия"],
    url: "https://www.uni-assist.de/en/",
    note: "У каждого вуза свой срок — проверь на его сайте.",
    estimated: true,
  },
  {
    id: "ua-winter-2027",
    exam: "uni-assist",
    title: "Дедлайн подачи на зимний семестр 2027/28 (многие вузы)",
    kind: "deadline",
    start: "2027-07-15",
    countries: ["Германия"],
    url: "https://www.uni-assist.de/en/",
    note: "У каждого вуза свой срок — проверь на его сайте.",
    estimated: true,
  },
];