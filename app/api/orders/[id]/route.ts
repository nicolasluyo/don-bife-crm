import { NextRequest, NextResponse } from "next/server";
import { db, orders } from "@/lib/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const [updated] = await db
    .update(orders)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(orders.id, parseInt(id)))
    .returning();

  return NextResponse.json(updated);
}
