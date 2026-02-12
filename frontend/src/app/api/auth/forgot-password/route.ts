import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Passwort-Reset per E-Mail ist deaktiviert. Bitte den Administrator kontaktieren.",
    },
    { status: 410 }
  );
}
