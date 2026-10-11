"use client";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { rpc, RpcError } from "@/lib/client";
import type { OpName, OpResult } from "@/lib/services";
import type { PublicUser } from "@/lib/types";

interface SessionValue {
  user: PublicUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionValue>({ user: null, loading: true, refresh: async () => {} });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      setUser(await rpc("me"));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => void refresh(), [refresh]);
  return <SessionContext.Provider value={{ user, loading, refresh }}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

/** Loads an operation's result; re-runs when the args change or reload() is called. */
export function useRpc<O extends OpName>(op: O, args?: unknown, enabled = true) {
  const [data, setData] = useState<OpResult<O> | null>(null);
  const [error, setError] = useState<RpcError | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(args ?? null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setLoading(true);
    rpc(op, args)
      .then((d) => alive && (setData(d as OpResult<O>), setError(null)))
      .catch((e) => alive && setError(e instanceof RpcError ? e : new RpcError(500, String(e))))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op, key, tick, enabled]);

  return { data, error, loading, reload: () => setTick((t) => t + 1) };
}

/** Client-side guard: sends signed-out visitors to /login and non-admins home. */
export function RequireAuth({ admin = false, children }: { admin?: boolean; children: React.ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const allowed = !!user && (!admin || user.role === "admin");

  useEffect(() => {
    if (loading || allowed) return;
    const qs = params.toString();
    router.replace(user ? "/" : `/login?next=${encodeURIComponent(path + (qs ? `?${qs}` : ""))}`);
  }, [loading, allowed, user, router, path, params]);

  return allowed ? <>{children}</> : <PageSpinner />;
}

export function PageSpinner() {
  return (
    <div className="flex justify-center py-24 muted" role="status" aria-label="Loading">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: RpcError; onRetry?: () => void }) {
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <div className="font-display text-lg font-bold">{error.status === 404 ? "Not found" : "Something went wrong"}</div>
      <p className="mt-1 text-sm muted">{error.message}</p>
      {onRetry && error.status !== 404 && (
        <button className="btn-outline mt-4" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
