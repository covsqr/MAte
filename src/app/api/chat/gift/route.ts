import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { getSession } from '@/lib/auth';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
          text: `🎁 [선물 전송] ${giftName}`
        }
      })
    ]);

    const companion = await prisma.companion.findUnique({ where: { id: companionId } });

    const systemPrompt = `너의 이름은 ${companion?.name}야. 
방금 나(사용자)에게서 [${giftName}]을(를) 선물 받았어.
너의 성격(${companion?.personality})에 맞춰서 반응해줘.`;

    const aiRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.8,
      max_tokens: 150,
    });

    const reply = aiRes.choices[0].message.content || "우와! 고마워!";

    const savedReply = await prisma.message.create({
      data: {
        companionId,
        sender: "companion",
        text: reply
      }
    });

    return NextResponse.json({
      success: true,
      reply: {
        id: savedReply.id,
        sender: "companion",
        text: savedReply.text,
        time: new Date(savedReply.createdAt).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })
      }
    });

  } catch (error) {
    console.error("Gift API Error:", error);
    return NextResponse.json({ error: "선물하기 실패" }, { status: 500 });
  }
}
