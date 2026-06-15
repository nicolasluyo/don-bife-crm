import { NextRequest, NextResponse } from "next/server";
import { db, orders } from "@/lib/db";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const result = await db.select().from(orders).orderBy(desc(orders.createdAt));

  const filtered = status
    ? result.filter((o) => o.status === status)
    : result;

  return NextResponse.json(filtered);
}
