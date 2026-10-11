"use client";
import { useState } from "react";
import { rpc, RpcError } from "@/lib/client";
import type { OpName, OpResult } from "@/lib/services";

/** Runs an admin operation with busy/error state, then calls onDone (usually a reload). */
export function useMutation(onDone?: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function run<O extends OpName>(op: O, args?: unknown): Promise<OpResult<O> | null> {
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const data = await rpc(op, args);
      onDone?.();
      return data as OpResult<O>;
    } catch (e) {
      const err = e instanceof RpcError ? e : new RpcError(500, "Request failed");
      setError(err.message);
      setFields(err.fields);
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { run, busy, error, fields, setError };
}
