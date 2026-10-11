import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AmbassadorLoginPageClient } from "./AmbassadorLoginPageClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getSession();
  if (session?.role === "ADMIN") {
    redirect("/admin/dashboard");
  }
  if (session?.role === "STUDENT") {
    redirect("/student/dashboard");
  }

  return <AmbassadorLoginPageClient />;
}
