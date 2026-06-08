import { NextRequest, NextResponse } from "next/server";
import { db, reservations } from "@/lib/db";
import { desc } from "drizzle-orm";
import { sendReservationEmail } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");

  const result = await db
    .select()
    .from(reservations)
    .orderBy(desc(reservations.date), reservations.time);

  const filtered = result.filter((r) => {
    if (status && r.status !== status) return false;
    if (date && r.date !== date) return false;
    return true;
  });

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const [reservation] = await db
    .insert(reservations)
    .values({
      customerName: body.customerName,
      phone: body.phone,
      date: body.date,
      time: body.time,
      guests: body.guests,
      occasion: body.occasion,
      notes: body.notes,
      customerId: body.customerId,
      status: "confirmed",
    })
    .returning();

  await sendReservationEmail(reservation).catch(console.error);

  return NextResponse.json(reservation, { status: 201 });
}
