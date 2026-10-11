"use client";
import { useEffect, useState } from "react";

const COLORS = ["#6366f1", "#d946ef", "#f59e0b", "#10b981", "#0ea5e9", "#f43f5e"];

/** Lightweight CSS confetti burst, no dependencies. */
export function Confetti() {
  const [pieces, setPieces] = useState<{ left: number; delay: number; dur: number; color: string; rot: number; size: number }[]>([]);
  useEffect(() => {
    setPieces(
      Array.from({ length: 90 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 2.2 + Math.random() * 1.8,
        color: COLORS[i % COLORS.length],
        rot: Math.random() * 360,
        size: 6 + Math.random() * 6,
      })),
    );
    const t = setTimeout(() => setPieces([]), 4500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      <style>{`@keyframes wq-fall{0%{transform:translateY(-10vh) rotate(0)}100%{transform:translateY(110vh) rotate(720deg)}}`}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 rounded-[2px]"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.45,
            background: p.color,
            transform: `rotate(${p.rot}deg)`,
            animation: `wq-fall ${p.dur}s cubic-bezier(.3,.6,.4,1) ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
