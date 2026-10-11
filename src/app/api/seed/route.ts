import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Seeding is permanently disabled. No data can be seeded without explicit administrative action." },
    { status: 403 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "Seeding is permanently disabled." },
    { status: 403 }
  );
}

