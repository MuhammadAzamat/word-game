"use client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(form: FormData) {
    setBusy(true);
    setError(null);
    setFields({});
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setFields(data.fields ?? {});
      setBusy(false);
      return;
    }
    router.push(safeNext);
    router.refresh();
  }

  const isLogin = mode === "login";
  return (
    <div className="mx-auto max-w-md animate-rise">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo className="size-14" />
        <h1 className="mt-5 font-display text-3xl font-bold">{isLogin ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 muted">{isLogin ? "Sign in to continue your missions." : "Save progress, earn stars, climb levels."}</p>
      </div>
      <form action={submit} className="card space-y-4 p-6 sm:p-8">
        {!isLogin && (
          <Field name="name" label="Name" autoComplete="name" error={fields.name} />
        )}
        <Field name="email" label="Email" type="email" autoComplete="email" error={fields.email} />
        <Field
          name="password"
          label="Password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          error={fields.password}
        />
        {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-500" role="alert">{error}</p>}
        <button className="btn-primary w-full py-3" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {isLogin ? "Sign in" : "Create account"}
        </button>
        <p className="text-center text-sm muted">
          {isLogin ? "New here? " : "Already have an account? "}
          <Link
            href={`/${isLogin ? "register" : "login"}${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-semibold text-brand-500 hover:underline"
          >
            {isLogin ? "Create an account" : "Sign in"}
          </Link>
        </p>
      </form>
      {isLogin && (
        <div className="mt-4 rounded-2xl border border-dashed hairline p-4 text-center text-xs muted">
          Demo learner: <b>demo@wordgame.dev</b> / <b>demo1234</b>
          <br />
          Demo admin: <b>admin@wordgame.dev</b> / <b>admin123</b>
        </div>
      )}
    </div>
  );
}

function Field({ name, label, error, ...rest }: { name: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} required className={`input ${error ? "ring-2 ring-rose-500" : ""}`} {...rest} />
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
}
