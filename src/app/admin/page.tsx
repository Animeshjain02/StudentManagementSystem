import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminRootPage() {
  const session = await getSession("ADMIN");
  if (!session || session.role !== "ADMIN") {
    redirect("/admin/login");
  }
  redirect("/admin/dashboard");
}
