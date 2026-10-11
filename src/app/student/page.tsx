import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StudentRootPage() {
  const session = await getSession("STUDENT");
  if (!session || session.role !== "STUDENT") {
    redirect("/student/login");
  }
  redirect("/student/dashboard");
}
