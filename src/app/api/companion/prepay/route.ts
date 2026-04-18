import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.points < 10000) {
      return NextResponse.json({ error: "포인트가 부족합니다. (10,000 P 필요)" }, { status: 400 });
    }

    // 포인트 차감
    await prisma.user.update({
      where: { id: session.userId },
      data: { points: { decrement: 10000 } }
    });

    return NextResponse.json({ success: true, message: "10,000 P가 차감되었습니다." });

  } catch (error) {
    console.error("Prepay error:", error);
    return NextResponse.json({ error: "처리 중 오류 발생" }, { status: 500 });
  }
}
