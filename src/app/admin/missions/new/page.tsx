import { MissionEditor } from "@/components/admin/MissionEditor";
import { PageHeader } from "@/components/admin/PageHeader";
import { getCategories } from "@/lib/db";

export const metadata = { title: "New mission" };

export default async function NewMission() {
  const categories = await getCategories();
  return (
    <>
      <PageHeader title="New mission" subtitle="Add words and clues — the crossword grid is generated automatically." />
      <MissionEditor categories={categories} />
    </>
  );
}
