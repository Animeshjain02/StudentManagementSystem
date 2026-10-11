import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentTrackRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/track/${encodeURIComponent(id)}`);
}
