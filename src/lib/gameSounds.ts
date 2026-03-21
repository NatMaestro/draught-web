let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  return ctx;
}

/** Short click for move / capture. */
export function playMoveSound(enabled: boolean) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.value = 520;
  g.gain.value = 0.06;
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + 0.06);
}

/** Wrong turn / invalid piece — two short low beeps. */
export function playWarningSound(enabled: boolean) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const t0 = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o.frequency.value = 200;
  g.gain.value = 0.055;
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + 0.09);
  const o2 = c.createOscillator();
  const g2 = c.createGain();
  o2.type = "square";
  o2.frequency.value = 155;
  g2.gain.value = 0.05;
  o2.connect(g2);
  g2.connect(c.destination);
  o2.start(t0 + 0.08);
  o2.stop(t0 + 0.2);
}

export function playGameOverSound(enabled: boolean) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "triangle";
  o.frequency.value = 220;
  g.gain.value = 0.08;
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + 0.25);
}
