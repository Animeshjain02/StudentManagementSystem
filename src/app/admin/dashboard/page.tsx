import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdminAnalytics } from "@/lib/server-admin-analytics";
import { AdminDashboardClient } from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getSession("ADMIN");
  if (!session || session.role !== "ADMIN") {
    redirect("/admin/login");
  }

  const data = await getAdminAnalytics();
  return <AdminDashboardClient initialData={data} />;
}
