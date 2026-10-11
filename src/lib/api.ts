import { NextResponse } from "next/server";

/**
 * Maps thrown errors to HTTP responses so client mistakes surface as 4xx with a readable
 * message instead of a blanket 500 (and internals are not leaked in production).
 */
export function handleApiError(err: any) {
  if (err?.name === "ValidationError" && err.errors) {
    const first = Object.values(err.errors)[0] as any;
    return NextResponse.json({ error: first?.message || "Validation failed." }, { status: 400 });
  }
  if (err?.name === "DocumentNotFoundError") {
    // The record was deleted by someone else between loading and saving it
    return NextResponse.json({ error: "This record no longer exists. Please refresh the page." }, { status: 404 });
  }
  if (err?.name === "VersionError") {
    return NextResponse.json({ error: "This record was changed by someone else. Please refresh and try again." }, { status: 409 });
  }
  if (err?.name === "CastError") {
    return NextResponse.json({ error: `Invalid value for '${err.path}'.` }, { status: 400 });
  }
  if (err?.code === 11000) {
    return NextResponse.json({ error: "A record with these details already exists." }, { status: 409 });
  }
  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }
  console.error("API error:", err);
  const message = process.env.NODE_ENV === "production" ? "Internal server error." : err?.message || "Internal server error.";
  return NextResponse.json({ error: message }, { status: 500 });
}
