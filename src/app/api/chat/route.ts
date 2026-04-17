import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    
    const { message, companionId } = await req.json();

    const companion = await prisma.companion.findUnique({ where: { id: companionId }});
    if (!companion) return NextResponse.json({ error: "Companion not found" }, { status: 404 });

    const now = new Date();
    
    // 메시지 길이에 따른 호감도 가중치 부여 (최소 1, 10자 이상이면 2)
    const intimacyGain = message.length >= 10 ? 2 : 1;

    // 유저의 메시지 DB 저장 (조용하게 저장만 함)
    const savedMessage = await prisma.message.create({
      data: {
        companionId,
        sender: "me",
        text: message,
        isRead: false // 메이트가 아직 안 읽은 상태
      }
    });

    // 호감도 업데이트 및 마지막 상호작용 시간 갱신
    await prisma.companion.update({
      where: { id: companionId },
      data: { lastInteractionAt: now }
    });

    return NextResponse.json({ 
      success: true, 
      messageId: savedMessage.id 
    });

  } catch (error: any) {
    console.error("Chat Send Error:", error);
    return NextResponse.json(
      { error: "메시지 전송에 실패했습니다." },
      { status: 500 }
    );
  }
}
