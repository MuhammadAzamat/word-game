"use client";
import { MissionTable } from "@/components/admin/MissionTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { ErrorState, PageSpinner, useRpc } from "@/components/session";

export default function AdminMissions() {
  const { data, error, reload } = useRpc("admin.missions");
  return (
    <>
      <PageHeader title="Missions" subtitle="Create crosswords, edit clues and publish when ready." />
      {error ? <ErrorState error={error} onRetry={reload} /> : !data ? <PageSpinner /> : (
        <MissionTable rows={data.rows} categories={data.categories} onChanged={reload} />
      )}
    </>
  );
}
