// Bookable session times: the next few days at fixed times (professionals' real calendars are a later integration).
export const SLOT_TIMES = [[10, 0], [16, 30], [18, 0], [20, 0]] as const;

export function upcomingSlots(now = new Date(), days = 4) {
  const out: { iso: string }[] = [];
  for (let d = 0; d < days; d++) {
    for (const [h, m] of SLOT_TIMES) {
      const t = new Date(now);
      t.setDate(now.getDate() + d); t.setHours(h, m, 0, 0);
      if (t.getTime() > now.getTime() + 30 * 60000) out.push({ iso: t.toISOString() });
    }
  }
  return out;
}

/** Jitsi on its own tab: embedding meet.jit.si is limited to 5 minutes, but a normal visit has no limit. The room name is random per booking. */
export const roomUrl = (room: string) => `https://meet.jit.si/AfterBloom-${room}#config.prejoinPageEnabled=false`;

/** A session can be joined from 10 minutes before it starts until an hour after. */
export const canJoin = (startsAt: string, now = Date.now()) => {
  const t = new Date(startsAt).getTime();
  return now >= t - 10 * 60000 && now <= t + 60 * 60000;
};
