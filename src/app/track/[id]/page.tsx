import React from "react";
import { redirect } from "next/navigation";
import { TrackProjectPageClient } from "./TrackProjectPageClient";
import { generateTrackingHash, isTrackingHash } from "@/lib/tracking-hash";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TrackProjectPage({ params }: PageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id || "").trim();

  // If the user visits with a raw project ID like PRJ-2026-00001,
  // automatically redirect to the hashed URL so the project ID is completely hashed in the address bar!
  if (decodedId && !isTrackingHash(decodedId)) {
    const hash = generateTrackingHash(decodedId);
    redirect(`/track/${hash}`);
  }

  return <TrackProjectPageClient initialProjectId={decodedId} />;
}
