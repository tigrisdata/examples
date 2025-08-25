import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  return NextResponse.json({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
}
