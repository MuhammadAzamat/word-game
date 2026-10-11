import { notFound } from "next/navigation";
import { MissionEditor } from "@/components/admin/MissionEditor";
import { PageHeader } from "@/components/admin/PageHeader";
import { getCategories, getMission } from "@/lib/db";

export const metadata = { title: "Edit mission" };

export default async function EditMission({ params }: { params: Promise<{ id: string }> }) {
  const [mission, categories] = await Promise.all([getMission((await params).id), getCategories()]);
  if (!mission) notFound();
  return (
    <>
      <PageHeader title="Edit mission" subtitle={mission.title} />
      <MissionEditor categories={categories} mission={mission} />
    </>
  );
}
