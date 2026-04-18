import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { companionId } = await req.json();

    // 대화 기록 삭제 및 말투 데이터 초기화
    await prisma.message.deleteMany({ where: { companionId } });
    await prisma.companion.update({
      where: { id: companionId, userId: session.userId },
      data: { 
        mirroringPattern: null,
        messageCount: 0
      }
    });

    return NextResponse.json({ success: true, message: "대화 기록이 초기화되었습니다." });

  } catch (error) {
    console.error("Clear chat error:", error);
    return NextResponse.json({ error: "초기화 실패" }, { status: 500 });
  }
}
