"use client";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { PageHeader } from "@/components/admin/PageHeader";
import { ErrorState, PageSpinner, useRpc } from "@/components/session";

export default function AdminCategories() {
  const { data, error, reload } = useRpc("admin.categories");
  return (
    <>
      <PageHeader title="Categories" subtitle="Group missions into themes shown on the home page." />
      {error ? <ErrorState error={error} onRetry={reload} /> : !data ? <PageSpinner /> : <CategoryManager rows={data} onChanged={reload} />}
    </>
  );
}
