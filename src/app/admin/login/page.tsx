import { redirect } from "next/navigation";
import { AdminLoginClient } from "./AdminLoginClient";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  return <AdminLoginClient />;
}
