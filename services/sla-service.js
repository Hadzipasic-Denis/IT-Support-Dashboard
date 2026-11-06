const computeSla = (ticket, newStatus, now, slaHours) => {
  const result = {
    slaWorkedSeconds: ticket.slaWorkedSeconds,
    slaClockStartedAt: ticket.slaClockStartedAt,
    slaBreachAt: ticket.slaBreachAt,
    slaBreachedAt: ticket.slaBreachedAt,
    resolvedAt: ticket.resolvedAt,
  };

  if (ticket.slaClockStartedAt && newStatus !== "IN_PROGRESS") {
    const projectedBreachAt = ticket.slaBreachAt;

    const workedNow = Math.floor(
      (now - new Date(ticket.slaClockStartedAt)) / 1000,
    );

    result.slaWorkedSeconds = ticket.slaWorkedSeconds + workedNow;
    result.slaClockStartedAt = null;
    result.slaBreachAt = null;

    if (result.slaWorkedSeconds >= slaHours * 3600 && !ticket.slaBreachedAt) {
      result.slaBreachedAt = new Date(projectedBreachAt);
    }
  }

  if (newStatus === "IN_PROGRESS" && !ticket.slaClockStartedAt) {
    result.slaClockStartedAt = now;
    const remainingTime = slaHours * 3600 - ticket.slaWorkedSeconds;

    result.slaBreachAt = new Date(now.getTime() + remainingTime * 1000);
  }

if (newStatus === "DONE") {
  result.resolvedAt = now;
} else if (ticket.resolvedAt) {
  result.resolvedAt = null;
}

  return result;
};

const getSlaState = (ticket, slaHours, now) => {
  const limitSeconds = slaHours * 3600;

  const breachedWhileRunning =
    ticket.slaClockStartedAt && now >= new Date(ticket.slaBreachAt);

  if (ticket.slaBreachedAt || breachedWhileRunning) {
    return { state: "BREACHED", remainingSeconds: 0 };
  }

  if (ticket.resolvedAt) {
    return { state: "MET", remainingSeconds: null };
  }

  if (ticket.slaClockStartedAt) {
    const remainingSeconds = Math.floor((new Date(ticket.slaBreachAt) - now) / 1000);
    return { state: "RUNNING", remainingSeconds };
  }

  return { state: "PAUSED", remainingSeconds: limitSeconds - ticket.slaWorkedSeconds };
};

const withSlaState = (ticket, now) => ({
  ...ticket,
  sla: getSlaState(ticket, ticket.slaHours, now)
})

module.exports = { computeSla, getSlaState, withSlaState };
