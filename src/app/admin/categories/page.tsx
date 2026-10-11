import { CategoryManager } from "@/components/admin/CategoryManager";
import { PageHeader } from "@/components/admin/PageHeader";
import { getCategories, readAll } from "@/lib/db";

export const metadata = { title: "Categories" };

export default async function AdminCategories() {
  const [categories, missions] = await Promise.all([getCategories(), readAll("missions")]);
  const rows = categories.map((c) => ({ ...c, missions: missions.filter((m) => m.categoryId === c.id).length }));
  return (
    <>
      <PageHeader title="Categories" subtitle="Group missions into themes shown on the home page." />
      <CategoryManager rows={rows} />
    </>
  );
}
