"use client";
import { AttemptTable } from "@/components/admin/AttemptTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { ErrorState, PageSpinner, useRpc } from "@/components/session";

export default function AdminAttempts() {
  const { data, error, reload } = useRpc("admin.attempts");
  return (
    <>
      <PageHeader title="Attempts" subtitle="Every game played, with scores, hints and timing." />
      {error ? <ErrorState error={error} onRetry={reload} /> : !data ? <PageSpinner /> : <AttemptTable rows={data} onChanged={reload} />}
    </>
  );
}
