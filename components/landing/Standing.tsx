"use client";
import { useId } from "react";

// The standing mother with her baby on her hip, drawn in a 150 x 200 box with her feet at (75, 192).
// Flat shapes with soft gradients, no outlines. Calm: a slow sway, a flowing dupatta, a blink every few seconds (all .idle, so they pause off-screen and for reduced motion).
// `sleepy` closes her eyes a little for the sleepless-nights stop. Skin and fabric colours are fixed so they stay warm in dark mode.
export function Standing({ sleepy = false, still = false }: { sleepy?: boolean; still?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const idle = still ? "" : "idle ";
  return (
    <g id="standing">
      <defs>
        <linearGradient id={`${uid}-kurta`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D2707B" /><stop offset="1" stopColor="#B04A56" /></linearGradient>
        <linearGradient id={`${uid}-dup`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FAD3CB" /><stop offset="1" stopColor="#E69A9A" /></linearGradient>
        <linearGradient id={`${uid}-wrap`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFF6E3" /><stop offset="1" stopColor="#F6DDAE" /></linearGradient>
      </defs>

      <ellipse cx="75" cy="194" rx="38" ry="5" fill="#3B1F2B" opacity=".12" />

      {/* the dupatta trails behind her */}
      <g className={`${idle}jn-dupatta`}>
        <path d="M56 92 C32 102 20 140 24 188 C36 178 44 152 54 130 C58 114 60 102 56 92Z" fill={`url(#${uid}-dup)`} />
      </g>

      <g id="mother" className={`${idle}jn-sway`}>
        <ellipse cx="62" cy="190" rx="9" ry="4" fill="#7A3B46" /><ellipse cx="88" cy="190" rx="9" ry="4" fill="#7A3B46" />
        <path d="M46 190 C44 140 50 104 75 92 C100 104 106 140 104 190Z" fill={`url(#${uid}-kurta)`} />
        <path d="M63 98 Q75 111 87 98 Q75 104 63 98Z" fill="#E0A63B" />
        <path d="M52 90 C60 100 90 100 98 90 C94 108 56 108 52 90Z" fill={`url(#${uid}-dup)`} />
        <rect x="70" y="82" width="10" height="12" rx="4" fill="#E3A987" />
        <path d="M52 100 C44 118 42 134 44 150 L51 150 C51 134 54 120 60 106Z" fill="#C45A68" /><circle cx="47.5" cy="153" r="4.6" fill="#EBB896" />
        <circle cx="75" cy="66" r="19" fill="#EBB896" />
        <path d="M55 64 C52 40 98 40 95 64 C93 52 57 52 55 64Z" fill="#3B1F2B" /><circle cx="75" cy="43" r="8" fill="#3B1F2B" />
        <circle cx="75" cy="57" r="2" fill="#C0392B" />
        {sleepy ? (
          <g fill="none" stroke="#5A3340" strokeWidth="2.4" strokeLinecap="round"><path d="M63.5 67 q4.5 3.4 9 0" /><path d="M77.5 67 q4.5 3.4 9 0" /></g>
        ) : (
          <g className={`${idle}jn-blink`} fill="#5A3340"><circle cx="68" cy="67" r="2.2" /><circle cx="82" cy="67" r="2.2" /></g>
        )}
        <path d={sleepy ? "M71 76 h8" : "M70 76 q5 4 10 0"} stroke="#B04A56" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <circle cx="62" cy="74" r="4" fill="#F2A7A0" opacity=".5" /><circle cx="88" cy="74" r="4" fill="#F2A7A0" opacity=".5" />
        <path d="M98 100 C106 112 108 126 100 138 L93 133 C98 124 96 114 92 106Z" fill="#C45A68" />
      </g>

      {/* the baby, on her hip */}
      <g id="baby">
        <path d="M92 114 C92 100 126 98 132 114 C136 130 126 148 109 148 C96 148 92 130 92 114Z" fill={`url(#${uid}-wrap)`} />
        <path d="M96 124 C108 118 120 118 130 124" stroke="#E0A63B" strokeWidth="2" fill="none" opacity=".55" strokeLinecap="round" />
        <circle cx="112" cy="97" r="15.5" fill="#F0C4A4" />
        <path d="M112 82.5 c-3.5 -7 5 -9.5 7.2 -4.2 c1.4 3.8 -3.6 5.2 -4 2" stroke="#3B1F2B" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <g className={`${idle}jn-blink jn-blink-b`} fill="#5A3340"><circle cx="106" cy="98" r="1.9" /><circle cx="118" cy="98" r="1.9" /></g>
        <circle cx="101.5" cy="104" r="3.6" fill="#F2A7A0" opacity=".55" /><circle cx="122.5" cy="104" r="3.6" fill="#F2A7A0" opacity=".55" />
        <path d="M108.5 104.5 q3.5 3.2 7 0" stroke="#B04A56" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="101" cy="126" r="4.2" fill="#F0C4A4" /><circle cx="121" cy="127" r="4.2" fill="#F0C4A4" />
      </g>
    </g>
  );
}
