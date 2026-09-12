/* AUTO LIVE controller — the endless loop:
   MATCH -> COUNTDOWN -> BATTLE -> ELIMINATIONS -> QUALIFICATION -> WINNER
   -> WINNER ANIM -> CTA -> INTERMISSION -> NEXT MATCH (forever when ON).
   The loop is driven by the single app tick (no extra timers), so it can
   run for hours without accumulating listeners or state. */

export function watchAutoLive({ match, settings, bus }) {
  const onInter = () => {
    // no-op: the Match handles the transition itself (autoNext in INTERMISSION)
  };
  const onOver = (info) => {
    if (info && info.autoLive) return;
  };
  bus.on('intermission:start', onInter);
  bus.on('match:over', onOver);
  return () => {
    bus.off('intermission:start', onInter);
    bus.off('match:over', onOver);
  };
}
