"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CrosswordGame } from "@/components/game/CrosswordGame";
import { ErrorState, PageSpinner, RequireAuth, useRpc } from "@/components/session";

export default function PlayPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <RequireAuth>
        <Play />
      </RequireAuth>
    </Suspense>
  );
}

function Play() {
  const id = useSearchParams().get("id") ?? "";
  const { data, error, reload } = useRpc("play", { id });
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <PageSpinner />;
  return (
    <CrosswordGame
      key={data.mission.id}
      missionId={data.mission.id}
      title={data.mission.title}
      category={data.category}
      timeLimit={data.mission.timeLimit}
      puzzle={data.puzzle}
      nextMission={data.nextMission}
    />
  );
}
