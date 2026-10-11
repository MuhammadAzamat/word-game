"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MissionEditor } from "@/components/admin/MissionEditor";
import { PageHeader } from "@/components/admin/PageHeader";
import { ErrorState, PageSpinner, useRpc } from "@/components/session";

export default function EditMissionPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <EditMission />
    </Suspense>
  );
}

function EditMission() {
  const id = useSearchParams().get("id") ?? undefined;
  const { data, error, reload } = useRpc("admin.mission", { id });
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data || (id && data.mission?.id !== id)) return <PageSpinner />;
  return (
    <>
      <PageHeader
        title={data.mission ? "Edit mission" : "New mission"}
        subtitle={data.mission?.title ?? "Add words and clues — the crossword grid is generated automatically."}
      />
      <MissionEditor key={data.mission?.id ?? "new"} categories={data.categories} mission={data.mission ?? undefined} />
    </>
  );
}
