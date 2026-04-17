import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { companionId, intimacy, points } = await req.json();

    if (intimacy !== undefined) {
      await prisma.companion.update({
        where: { id: companionId, userId: session.userId },
        data: { intimacy: parseInt(intimacy) }
      });
    }

    if (points !== undefined) {
      await prisma.user.update({
        where: { id: session.userId },
        data: { points: parseInt(points) }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin stats update error:", error);
    return NextResponse.json({ error: "Failed to update stats" }, { status: 500 });
  }
}
