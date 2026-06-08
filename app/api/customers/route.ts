import { NextResponse } from "next/server";
import { db, customers } from "@/lib/db";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await db
    .select()
    .from(customers)
    .orderBy(desc(customers.lastContactAt));

  return NextResponse.json(result);
}
