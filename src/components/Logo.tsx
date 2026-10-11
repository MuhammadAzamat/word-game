export function Logo({ className = "size-9" }: { className?: string }) {
  return (
    <span className={`grid grid-cols-2 gap-0.5 rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 p-1.5 shadow-md shadow-brand-500/30 ${className}`}>
      {["W", "O", "", "R"].map((l, i) => (
        <span
          key={i}
          className={`flex items-center justify-center rounded-[4px] text-[8px] font-black leading-none ${l ? "bg-white text-brand-600" : "bg-white/25"}`}
        >
          {l}
        </span>
      ))}
    </span>
  );
}
