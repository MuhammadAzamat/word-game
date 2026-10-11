"use client";
import { PageHeader } from "@/components/admin/PageHeader";
import { UserTable } from "@/components/admin/UserTable";
import { ErrorState, PageSpinner, useRpc } from "@/components/session";

export default function AdminUsers() {
  const { data, error, reload } = useRpc("admin.users");
  return (
    <>
      <PageHeader title="Users" subtitle={data ? `${data.rows.length} accounts. Promote trusted people to admin.` : undefined} />
      {error ? <ErrorState error={error} onRetry={reload} /> : !data ? <PageSpinner /> : (
        <UserTable rows={data.rows} meId={data.meId} onChanged={reload} />
      )}
    </>
  );
}
