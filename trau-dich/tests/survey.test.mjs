import test from "node:test";
import assert from "node:assert/strict";
import {
  BUDGETS,
  ANSWERS,
  FORM_ENDPOINT,
  createState,
  selectBudget,
  answerBudget,
  countAnswers,
  firstMissing,
  nextUnanswered,
  buildPayload,
} from "../js/survey.js";
import { ROUTES, ORIGIN } from "../js/world.js";

function permutations(values) {
  return values.length
    ? values.flatMap((v, i) =>
        permutations(values.filter((_, j) => j !== i)).map((p) => [v, ...p]),
      )
    : [[]];
}
const orders = permutations([0, 1, 2, 3]);
const combinations = ANSWERS.flatMap((a) =>
  ANSWERS.flatMap((b) =>
    ANSWERS.flatMap((c) => ANSWERS.map((d) => [a, b, c, d])),
  ),
);

test("Contract: exactly four independent budgets and four allowed answers", () => {
  assert.deepEqual(
    BUDGETS.map((x) => x.label),
    ["Bis 100 €", "100–200 €", "200–300 €", "Über 300 €"],
  );
  assert.deepEqual(ANSWERS, [
    "Sehr wahrscheinlich",
    "Eher ja",
    "Eher nein",
    "Nein",
  ]);
  assert.equal(FORM_ENDPOINT, "https://formspree.io/f/myeeepoe");
});

for (let index = 0; index < combinations.length; index++) {
  const answers = combinations[index];
  test(`Combination ${String(index + 1).padStart(3, "0")}/256: exact payload in all 24 completion orders`, () => {
    for (const order of orders) {
      let state = createState();
      for (let step = 0; step < order.length; step++) {
        state = selectBudget(state, order[step]);
        state = answerBudget(state, answers[order[step]]);
        assert.equal(countAnswers(state.answers), step + 1);
      }
      for (const budget of [3, 0, 2, 1, 3, 2, 0])
        state = selectBudget(state, budget);
      assert.deepEqual(state.answers, answers);
      assert.equal(firstMissing(state.answers), -1);
      assert.equal(nextUnanswered(state.answers, state.level), null);
      assert.deepEqual(buildPayload(state.answers), {
        veranstaltung: "Überraschungsfahrt 2027",
        budget_bis_100: answers[0],
        budget_100_200: answers[1],
        budget_200_300: answers[2],
        budget_ueber_300: answers[3],
      });
      // Changing one budget must not imply monotonic willingness for other prices.
      const replacement = ANSWERS[(ANSWERS.indexOf(answers[2]) + 1) % 4];
      state = answerBudget(selectBudget(state, 2), replacement);
      assert.deepEqual(state.answers, [
        answers[0],
        answers[1],
        replacement,
        answers[3],
      ]);
    }
  });
}

for (let mask = 0; mask < 15; mask++) {
  test(`Incomplete response pattern ${mask}: never creates a payload`, () => {
    const answers = BUDGETS.map((_, index) =>
      mask & (1 << index) ? ANSWERS[index] : null,
    );
    assert.equal(countAnswers(answers), answers.filter(Boolean).length);
    assert.equal(firstMissing(answers), answers.indexOf(null));
    assert.throws(() => buildPayload(answers), /vier Budgetstufen/);
    for (let from = 0; from < 4; from++) {
      const next = nextUnanswered(answers, from);
      assert.equal(answers[next], null);
    }
  });
}
test("State transitions are immutable", () => {
  const previous = createState();
  const next = answerBudget(selectBudget(previous, 3), "Nein");
  assert.deepEqual(previous, { level: 0, answers: [null, null, null, null] });
  assert.notEqual(previous.answers, next.answers);
});
test("Invalid levels and answers are rejected", () => {
  for (const value of [-1, 4, 1.5, NaN, undefined, "1"])
    assert.throws(() => selectBudget(createState(), value), RangeError);
  for (const value of ["Vielleicht", "", 0, undefined, null])
    assert.throws(() => answerBudget(createState(), value), TypeError);
  for (const value of [null, [], {}, ["Nein"], Array(5).fill("Nein")])
    assert.throws(() => buildPayload(value), TypeError);
});
test("Every illustrated route leaves the same origin and never identifies a destination", () => {
  assert.equal(ROUTES.length, 8);
  for (const route of ROUTES) {
    assert.ok(route.d.startsWith(`M${ORIGIN.x} ${ORIGIN.y} `));
    assert.ok(route.level >= 0 && route.level <= 3);
    assert.ok(["bus", "car", "train", "plane"].includes(route.vehicle));
  }
  for (let level = 0; level < 4; level++)
    assert.equal(
      ROUTES.filter((x) => x.level <= level).length,
      2 * (level + 1),
    );
});
