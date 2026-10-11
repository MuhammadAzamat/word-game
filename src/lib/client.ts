"use client";
import type { OpName, OpResult } from "./services";

/** True in the GitHub Pages build, where everything runs in the browser. */
export const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "1";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix for plain <a href> and window.location links (next/link adds it itself). */
export const withBase = (path: string) => `${BASE_PATH}${path}`;

export class RpcError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

type Op = OpName | "logout";
type Result<O extends Op> = O extends OpName ? OpResult<O> : null;

/** Calls an operation on the server (/api/rpc) or, in the static build, in the browser. */
export async function rpc<O extends Op>(op: O, args?: unknown): Promise<Result<O>> {
  if (IS_STATIC) {
    const { localCall, ApiError } = await import("./local-backend");
    try {
      return (await localCall(op, args)) as Result<O>;
    } catch (e) {
      if (e instanceof ApiError) throw new RpcError(e.status, e.message, e.fields);
      throw e;
    }
  }
  const res = await fetch("/api/rpc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op, args }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new RpcError(res.status, body.error ?? "Something went wrong", body.fields);
  return body.data as Result<O>;
}
