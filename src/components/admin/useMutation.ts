"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** fetch + JSON + router.refresh(), with error state for admin forms. */
export function useMutation() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function run<T = unknown>(url: string, method: string, body?: unknown): Promise<T | null> {
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        setFields(data.fields ?? {});
        return null;
      }
      router.refresh();
      return data as T;
    } finally {
      setBusy(false);
    }
  }

  return { run, busy, error, fields, setError };
}
