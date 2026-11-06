const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { computeSla, getSlaState } = require("../services/sla-service.js");

const at = (time) => new Date(`2026-11-04T${time}:00Z`);
const day = (date, time) => new Date(`2026-11-${date}T${time}:00Z`);

const empty = {
  slaWorkedSeconds: 0,
  slaClockStartedAt: null,
  slaBreachAt: null,
  slaBreachedAt: null,
  resolvedAt: null,
};

describe("stopping the clock", () => {
  test("adds the time of this run", () => {
    const result = computeSla(
      { ...empty, slaClockStartedAt: at("10:00") },
      "WAITING_FOR_FEEDBACK",
      at("12:30"),
      120,
    );

    assert.deepEqual(result, { ...empty, slaWorkedSeconds: 9000 });
  });

  test("keeps time already worked", () => {
    const result = computeSla(
      { ...empty, slaWorkedSeconds: 3600, slaClockStartedAt: at("10:00") },
      "WAITING_FOR_FEEDBACK",
      at("12:30"),
      120,
    );

    assert.deepEqual(result, { ...empty, slaWorkedSeconds: 12600 });
  });

  test("does nothing when the clock is not running", () => {
    const result = computeSla(empty, "WAITING_FOR_FEEDBACK", at("12:30"), 120);

    assert.deepEqual(result, empty);
  });
});

describe("starting the clock", () => {
  test("forecasts the breach after the full limit", () => {
    const result = computeSla(empty, "IN_PROGRESS", at("10:00"), 120);

    assert.deepEqual(result, {
      ...empty,
      slaClockStartedAt: at("10:00"),
      slaBreachAt: day("09", "10:00"),
    });
  });

  test("subtracts time already worked from the forecast", () => {
    const result = computeSla(
      { ...empty, slaWorkedSeconds: 9000 },
      "IN_PROGRESS",
      at("10:00"),
      120,
    );

    assert.deepEqual(result, {
      ...empty,
      slaWorkedSeconds: 9000,
      slaClockStartedAt: at("10:00"),
      slaBreachAt: day("09", "07:30"),
    });
  });
});

describe("breach detection", () => {
  test("records the forecast time when the limit passed while running", () => {
    const result = computeSla(
      { ...empty, slaClockStartedAt: at("10:00"), slaBreachAt: at("11:00") },
      "WAITING_FOR_FEEDBACK",
      at("12:00"),
      1,
    );

    assert.deepEqual(result, {
      ...empty,
      slaWorkedSeconds: 7200,
      slaBreachedAt: at("11:00"),
    });
  });

  test("records no breach when stopped in time", () => {
    const result = computeSla(
      { ...empty, slaClockStartedAt: at("10:00"), slaBreachAt: at("11:00") },
      "WAITING_FOR_FEEDBACK",
      at("10:30"),
      1,
    );

    assert.deepEqual(result, { ...empty, slaWorkedSeconds: 1800 });
  });

  test("keeps an earlier breach time", () => {
    const result = computeSla(
      {
        ...empty,
        slaWorkedSeconds: 7200,
        slaClockStartedAt: at("10:00"),
        slaBreachAt: at("10:00"),
        slaBreachedAt: at("08:00"),
      },
      "WAITING_FOR_FEEDBACK",
      at("10:30"),
      1,
    );

    assert.deepEqual(result, {
      ...empty,
      slaWorkedSeconds: 9000,
      slaBreachedAt: at("08:00"),
    });
  });
});

describe("resolving and reopening", () => {
  test("stops the clock and sets resolvedAt when done", () => {
    const result = computeSla(
      { ...empty, slaClockStartedAt: at("10:00"), slaBreachAt: at("15:00") },
      "DONE",
      at("12:00"),
      5,
    );

    assert.deepEqual(result, {
      ...empty,
      slaWorkedSeconds: 7200,
      resolvedAt: at("12:00"),
    });
  });

  test("clears resolvedAt and keeps worked time when reopened", () => {
    const result = computeSla(
      { ...empty, slaWorkedSeconds: 7200, resolvedAt: at("12:00") },
      "IN_PROGRESS",
      at("14:00"),
      5,
    );

    assert.deepEqual(result, {
      ...empty,
      slaWorkedSeconds: 7200,
      slaClockStartedAt: at("14:00"),
      slaBreachAt: at("17:00"),
    });
  });

  test("moves the forecast when the limit changes while running", () => {
    const result = computeSla(
      {
        ...empty,
        slaWorkedSeconds: 3600,
        slaClockStartedAt: at("10:00"),
        slaBreachAt: at("15:00"),
      },
      "IN_PROGRESS",
      at("12:00"),
      3,
    );

    assert.deepEqual(result, {
      ...empty,
      slaWorkedSeconds: 3600,
      slaClockStartedAt: at("10:00"),
      slaBreachAt: at("12:00"),
    });
  });

  test("uses the new limit for a breach when stopping", () => {
    const result = computeSla(
      {
        ...empty,
        slaClockStartedAt: at("10:00"),
        slaBreachAt: at("15:00"),
      },
      "WAITING_FOR_FEEDBACK",
      at("12:00"),
      1,
    );

    assert.deepEqual(result, {
      ...empty,
      slaWorkedSeconds: 7200,
      slaBreachedAt: at("11:00"),
    });
  });

  test("keeps resolvedAt when a resolved ticket is saved again", () => {
    const result = computeSla(
      {
        ...empty,
        slaWorkedSeconds: 7200,
        resolvedAt: at("12:00"),
      },
      "DONE",
      at("14:00"),
      5,
    );

    assert.deepEqual(result, {
      ...empty,
      slaWorkedSeconds: 7200,
      resolvedAt: at("12:00"),
    });
  });
});

describe("SLA state", () => {
  test("is RUNNING with the time until the forecast", () => {
    const state = getSlaState(
      { ...empty, slaClockStartedAt: at("10:00"), slaBreachAt: at("13:00") },
      120,
      at("10:00"),
    );

    assert.deepEqual(state, { state: "RUNNING", remainingSeconds: 10800 });
  });

  test("is BREACHED when the forecast has passed while running", () => {
    const state = getSlaState(
      { ...empty, slaClockStartedAt: at("10:00"), slaBreachAt: at("11:00") },
      1,
      at("12:00"),
    );

    assert.deepEqual(state, { state: "BREACHED", remainingSeconds: 0 });
  });

  test("is MET when resolved in time", () => {
    const state = getSlaState(
      { ...empty, slaWorkedSeconds: 7200, resolvedAt: at("12:00") },
      5,
      at("14:00"),
    );

    assert.deepEqual(state, { state: "MET", remainingSeconds: null });
  });

  test("is BREACHED when resolved after a breach", () => {
    const state = getSlaState(
      {
        ...empty,
        slaWorkedSeconds: 7200,
        slaBreachedAt: at("11:00"),
        resolvedAt: at("12:00"),
      },
      1,
      at("14:00"),
    );

    assert.deepEqual(state, { state: "BREACHED", remainingSeconds: 0 });
  });

  test("is PAUSED with the remaining limit", () => {
    const state = getSlaState(
      { ...empty, slaWorkedSeconds: 3600 },
      2,
      at("14:00"),
    );

    assert.deepEqual(state, { state: "PAUSED", remainingSeconds: 3600 });
  });
});
