/** Pure survey rules. No DOM, network requests, or storage. */
export const EVENT_NAME = "Überraschungsfahrt 2027";
export const FORM_ENDPOINT = "https://formspree.io/f/myeeepoe";
export const BUDGETS = Object.freeze([
  Object.freeze({
    label: "Bis 100 €",
    spoken: "Bis 100 Euro",
    field: "budget_bis_100",
    description: "Kleines Budget. Großes Abenteuer.",
  }),
  Object.freeze({
    label: "100–200 €",
    spoken: "100 bis 200 Euro",
    field: "budget_100_200",
    description: "Mehr Wege, mehr Möglichkeiten.",
  }),
  Object.freeze({
    label: "200–300 €",
    spoken: "200 bis 300 Euro",
    field: "budget_200_300",
    description: "Die Welt wird ein Stück größer.",
  }),
  Object.freeze({
    label: "Über 300 €",
    spoken: "Über 300 Euro",
    field: "budget_ueber_300",
    description: "Viel Raum für Überraschungen.",
  }),
]);
export const ANSWERS = Object.freeze([
  "Sehr wahrscheinlich",
  "Eher ja",
  "Eher nein",
  "Nein",
]);

export function createState() {
  return { level: 0, answers: Array(4).fill(null) };
}
export function selectBudget(state, level) {
  if (!Number.isInteger(level) || level < 0 || level >= BUDGETS.length)
    throw new RangeError("Ungültige Budgetstufe.");
  return { level, answers: [...state.answers] };
}
export function answerBudget(state, answer) {
  if (!ANSWERS.includes(answer)) throw new TypeError("Ungültige Antwort.");
  const answers = [...state.answers];
  answers[state.level] = answer;
  return { level: state.level, answers };
}
export function firstMissing(answers) {
  return BUDGETS.findIndex((_, index) => !ANSWERS.includes(answers?.[index]));
}
export function countAnswers(answers) {
  return BUDGETS.filter((_, index) => ANSWERS.includes(answers?.[index]))
    .length;
}
export function nextUnanswered(answers, current) {
  for (let step = 1; step <= BUDGETS.length; step++) {
    const index = (current + step) % BUDGETS.length;
    if (!ANSWERS.includes(answers?.[index])) return index;
  }
  return null;
}
export function buildPayload(answers) {
  if (
    !Array.isArray(answers) ||
    answers.length !== 4 ||
    firstMissing(answers) !== -1
  ) {
    throw new TypeError("Bitte alle vier Budgetstufen bewerten.");
  }
  return Object.fromEntries([
    ["veranstaltung", EVENT_NAME],
    ...BUDGETS.map((budget, index) => [budget.field, answers[index]]),
  ]);
}
