"use client";
import { LazyMotion, MotionConfig } from "motion/react";
import { spring } from "@/lib/motion";

const loadFeatures = () => import("@/lib/motion-features").then((r) => r.default);

// reducedMotion="user": transforms/layout animations are disabled, opacity still fades.
// Use `m.*` from "motion/react-m" inside; `strict` throws if a full `motion.*` sneaks in.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={spring.gentle}>{children}</MotionConfig>
    </LazyMotion>
  );
}
