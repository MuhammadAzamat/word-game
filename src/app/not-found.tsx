import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center animate-rise">
      <div className="font-display text-7xl font-bold">
        4<span className="text-brand-500">0</span>4
      </div>
      <p className="mt-3 muted">This square is empty. The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className="btn-primary mt-6">Back to missions</Link>
    </div>
  );
}
