import {
  BUDGETS,
  createState,
  selectBudget,
  answerBudget,
  countAnswers,
  firstMissing,
  nextUnanswered,
  buildPayload,
} from "./survey.js";
import { submitSurvey } from "./submit.js";
import { initWorld } from "./world.js";

const root = document.querySelector("#experience");
const form = document.querySelector("#budget-form");
const slider = document.querySelector("#budget-slider");
const stops = [...document.querySelectorAll(".budget-stop")];
const radios = [...document.querySelectorAll('input[name="readiness"]')];
const message = document.querySelector("#form-message");
const submit = document.querySelector("#submit-button");
const next = document.querySelector("#next-budget");
let state = createState();
let pending = false;
let submitted = false;
let validationActive = false;
let world;
// Survey stays usable if an optional visual API fails on an older browser.
try {
  world = initWorld(root);
} catch (error) {
  console.warn("Die Weltanimation ist in diesem Browser eingeschränkt.", error);
}

function showMessage(text, kind = "error") {
  message.textContent = text;
  message.classList.toggle("is-info", kind === "info");
  message.hidden = false;
}
function clearMessage() {
  message.hidden = true;
  message.textContent = "";
}
function render() {
  const budget = BUDGETS[state.level];
  slider.value = String(state.level);
  slider.setAttribute("aria-valuetext", budget.spoken);
  slider.style.setProperty("--range-progress", `${(state.level / 3) * 100}%`);
  document.querySelector("#budget-value").textContent = budget.label;
  document.querySelector("#budget-description").textContent =
    budget.description;
  document.querySelector("#answer-context").textContent =
    `Deine Einschätzung für ${budget.spoken}.`;
  radios.forEach((radio) => {
    radio.checked = radio.value === state.answers[state.level];
  });
  stops.forEach((stop, index) => {
    stop.classList.toggle("is-current", index === state.level);
    stop.classList.toggle("is-answered", Boolean(state.answers[index]));
    stop.setAttribute("aria-pressed", String(index === state.level));
    stop.setAttribute(
      "aria-label",
      `${BUDGETS[index].spoken}, ${state.answers[index] || "noch offen"}`,
    );
  });
  const count = countAnswers(state.answers);
  document.querySelector("#answer-progress").textContent =
    `${count} von 4 Budgets bewertet`;
  next.hidden = count === 4;
  root.dataset.answered = String(count);
  form.dataset.complete = String(count === 4);
  const invalidCurrent = validationActive && !state.answers[state.level];
  document
    .querySelector("#answer-fieldset")
    .setAttribute("aria-invalid", String(invalidCurrent));
}
function chooseLevel(level, { focusAnswer = false } = {}) {
  if (pending || submitted) return;
  state = selectBudget(state, level);
  render();
  world?.setLevel(level);
  if (focusAnswer) (radios.find((radio) => radio.checked) || radios[0]).focus();
}
slider.addEventListener("input", () => chooseLevel(Number(slider.value)));
stops.forEach((stop) =>
  stop.addEventListener("click", () => chooseLevel(Number(stop.dataset.level))),
);
radios.forEach((radio) =>
  radio.addEventListener("change", () => {
    if (pending || submitted) return;
    state = answerBudget(state, radio.value);
    clearMessage();
    render();
  }),
);
next.addEventListener("click", () => {
  const target = nextUnanswered(state.answers, state.level);
  if (target === null) return;
  chooseLevel(target, { focusAnswer: true });
});

function setPending(value) {
  pending = value;
  form.setAttribute("aria-busy", String(value));
  submit.disabled = value;
  slider.disabled = value;
  stops.forEach((stop) => {
    stop.disabled = value;
  });
  document.querySelector("#answer-fieldset").disabled = value;
  next.disabled = value;
  document.querySelector("#submit-label").textContent = value
    ? "Dein Stimmungsbild ist unterwegs …"
    : "Stimmungsbild abschicken";
  document.querySelector(".submit-arrow").toggleAttribute("hidden", value);
  document.querySelector(".spinner").hidden = !value;
}
function showSuccess() {
  const summary = document.querySelector("#success-summary");
  BUDGETS.forEach((budget, index) => {
    const row = document.createElement("div");
    row.className = "summary-line";
    const label = document.createElement("span");
    label.textContent = budget.label;
    const answer = document.createElement("strong");
    answer.textContent = state.answers[index];
    row.append(label, answer);
    summary.append(row);
  });
  form.hidden = true;
  document.querySelector(".survey-intro").hidden = true;
  const panel = document.querySelector("#success-panel");
  panel.hidden = false;
  panel.focus({ preventScroll: true });
  // Keep the result in view after replacing a tall form on a narrow screen.
  if (panel.getBoundingClientRect().top < 0)
    panel.scrollIntoView({ block: "start", behavior: "instant" });
  root.classList.add("is-submitted");
  world?.celebrate();
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (pending || submitted) return;
  const missing = firstMissing(state.answers);
  if (missing !== -1) {
    validationActive = true;
    chooseLevel(missing, { focusAnswer: true });
    showMessage(
      `Fast geschafft! Bitte bewerte noch „${BUDGETS[missing].label}“. Alle vier Budgets gehören dazu.`,
    );
    return;
  }
  clearMessage();
  const payload = buildPayload(state.answers);
  setPending(true); // Synchronous guard before the first await prevents duplicate clicks.
  const slowHint = setTimeout(
    () =>
      showMessage(
        "Es dauert gerade etwas länger. Bitte lass die Seite kurz geöffnet.",
        "info",
      ),
    6500,
  );
  try {
    await submitSurvey(payload);
    submitted = true;
    clearMessage();
    showSuccess();
  } catch (error) {
    showMessage(error.message);
  } finally {
    clearTimeout(slowHint);
    setPending(false);
    if (!submitted) submit.focus({ preventScroll: true });
  }
});

let lastDialogTrigger;
for (const trigger of document.querySelectorAll("[data-open-dialog]")) {
  trigger.addEventListener("click", () => {
    lastDialogTrigger = trigger;
    document.getElementById(trigger.dataset.openDialog).showModal();
  });
}
for (const dialog of document.querySelectorAll("dialog")) {
  dialog
    .querySelector(".dialog-close")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () =>
    lastDialogTrigger?.focus({ preventScroll: true }),
  );
}
render();
root.dataset.ready = "true";
