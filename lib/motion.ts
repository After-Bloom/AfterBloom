// One shared motion set for the whole app. Import from here, never hand-roll springs.
// CSS equivalents (generated with Motion's spring()) are --spring-* in app/globals.css.
import type { Transition, Variants } from "motion/react";

export const spring = {
  gentle: { type: "spring", stiffness: 170, damping: 24, mass: 1 },   // entrances, page transitions
  snappy: { type: "spring", stiffness: 420, damping: 30, mass: 0.8 }, // taps, toggles, press feedback
  soft: { type: "spring", stiffness: 60, damping: 14, mass: 1 },      // bloom, breathing
} satisfies Record<string, Transition>;

export const ease = [0.22, 1, 0.36, 1] as const; // opacity/colour tweens
export const dur = { fast: 0.15, base: 0.25, slow: 0.45, exit: 0.16 } as const; // exit ~65% of enter
export const STAGGER = 0.04;

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: dur.base, ease } },
  exit: { opacity: 0, transition: { duration: dur.exit, ease } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: spring.gentle },
  exit: { opacity: 0, y: 6, transition: { duration: dur.exit, ease } },
};

export const stagger = (delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: STAGGER, delayChildren: delay } },
});

export const tap = { scale: 0.96, transition: spring.snappy };
export const hover = { y: -3, transition: spring.snappy };
