import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.userId;

    const { giftId, giftName, points, companionId } = await req.json();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.points < points) {
      return NextResponse.json({ error: "포인트가 부족합니다." }, { status: 400 });
    }

    // 트랜잭션: 포인트 차감, 호감도 상승, 선물 메시지 기록
    // 응답은 여기서 생성하지 않고 sync API가 대화 맥락에 맞춰 생성하도록 함
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { points: { decrement: points } }
      }),
      prisma.companion.update({
        where: { id: companionId },
        data: { intimacy: { increment: Math.floor(points / 10) } }
      }),
      prisma.message.create({
        data: {
          companionId,
          sender: "me",
          text: `🎁 [선물 전송] ${giftName}`,
          isRead: false
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: "선물이 전달되었습니다. 곧 메이트의 답장이 도착합니다."
    });

  } catch (error) {
    console.error("Gift API Error:", error);
    return NextResponse.json({ error: "선물하기 실패" }, { status: 500 });
  }
}
