"use client";
import { useEffect } from "react";
import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { Bloom } from "./landing/Bloom";
import { spring } from "@/lib/motion";

/** The signature element: a flower that opens as she completes check-ins. value is 0 (bud) to 1 (open). */
export function BloomProgress({ value, className = "w-24", label }: { value: number; className?: string; label: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  useEffect(() => {
    if (reduce) { mv.set(value); return; }
    const c = animate(mv, value, spring.soft);
    return () => c.stop();
  }, [value, reduce, mv]);
  return <Bloom progress={mv} className={className} label={label} />;
}
