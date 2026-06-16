import MetricsCards from "./MetricsCards";
import ActivityChart from "./ActivityChart";
import ReservationsToday from "./ReservationsToday";
import RecentConversations from "./RecentConversations";
import { db, messages, conversations, reservations, customers } from "@/lib/db";
import { eq, gte, sql, count, and } from "drizzle-orm";

async function getMetrics() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [totalCustomers] = await db.select({ count: count() }).from(customers);
    const [activeConversations] = await db.select({ count: count() }).from(conversations).where(eq(conversations.status, "active"));
    const [needsHuman] = await db.select({ count: count() }).from(conversations).where(eq(conversations.status, "needs_human"));
    const [todayMessages] = await db.select({ count: count() }).from(messages).where(gte(messages.sentAt, today));
    const [weekMessages] = await db.select({ count: count() }).from(messages).where(gte(messages.sentAt, weekAgo));

    const todayStr = today.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
    const todayReservations = await db.select().from(reservations).where(and(eq(reservations.date, todayStr), eq(reservations.status, "confirmed")));

    const [confirmedReservations] = await db.select({ count: count() }).from(reservations).where(eq(reservations.status, "confirmed"));

    const dailyMessages = await db
      .select({
        day: sql<string>`DATE(${messages.sentAt})`,
        total: count(),
        incoming: sql<number>`SUM(CASE WHEN ${messages.direction} = 'incoming' THEN 1 ELSE 0 END)`,
        outgoing: sql<number>`SUM(CASE WHEN ${messages.direction} = 'outgoing' THEN 1 ELSE 0 END)`,
      })
      .from(messages)
      .where(gte(messages.sentAt, weekAgo))
      .groupBy(sql`DATE(${messages.sentAt})`)
      .orderBy(sql`DATE(${messages.sentAt})`);

    return {
      totalCustomers: totalCustomers.count,
      activeConversations: activeConversations.count,
      needsHuman: needsHuman.count,
      todayMessages: todayMessages.count,
      weekMessages: weekMessages.count,
      confirmedReservations: confirmedReservations.count,
      todayReservations,
      dailyMessages,
    };
  } catch {
    return null;
  }
}

export default async function DashboardContent() {
  const metrics = await getMetrics();

  if (!metrics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
        <p className="font-medium">Base de datos no configurada</p>
        <p className="text-sm mt-1">Configure DATABASE_URL en .env.local y ejecute las migraciones.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MetricsCards metrics={metrics} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityChart data={metrics.dailyMessages} />
        </div>
        <div>
          <ReservationsToday reservations={metrics.todayReservations} />
        </div>
      </div>
      <RecentConversations />
    </div>
  );
}
