import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getStudentDashboardData } from "@/lib/server-student-dashboard";
import { StudentDashboardClient } from "./StudentDashboardClient";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const session = await getSession("STUDENT");
  if (!session || session.role !== "STUDENT") {
    redirect("/student/login");
  }

  const data = await getStudentDashboardData(session.userId);
  return <StudentDashboardClient initialData={data} />;
}
