import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { getCurrentActivity } from '@/lib/activities';
import { getSession } from '@/lib/auth';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ message: "No session" }, { status: 401 });
    const userId = session.userId;

    const companion = await prisma.companion.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    if (!companion) return NextResponse.json({ message: "No companion" });

    const now = new Date();
    const lastInteraction = new Date(companion.lastInteractionAt);
    const diffMs = now.getTime() - lastInteraction.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    const lastMessage = await prisma.message.findFirst({
      where: { companionId: companion.id },
      orderBy: { createdAt: "desc" }
    });

    if (!lastMessage || lastMessage.sender === "companion" || diffHours < 3) {
      return NextResponse.json({ hasNewMessage: false });
    }

    const activity = getCurrentActivity(now, companion.mbti);

    const systemPrompt = `너의 이름은 ${companion.name}야. 
현재 상황: ${activity.name} (${activity.description}), 기분: ${activity.mood}
나(사용자)와의 관계: ${companion.relationship}

[미션]
사용자가 한동안 연락이 없었어. 지금 너의 상황이나 기분에 맞춰서 먼저 말을 걸어봐.
너의 성격(${companion.personality})을 잘 드러내야 해.

[지침]
1. 이모지 절대 금지.
2. 20대 카톡 말투 사용.
3. 아주 짧고 자연스럽게.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.9,
      max_tokens: 100,
    });

    const reply = response.choices[0].message.content || "뭐해?";

    const [newMessage] = await prisma.$transaction([
      prisma.message.create({
        data: {
          companionId: companion.id,
          sender: "companion",
          text: reply,
        }
      }),
      prisma.companion.update({
        where: { id: companion.id },
        data: { lastInteractionAt: now }
      })
    ]);

    return NextResponse.json({ 
      hasNewMessage: true, 
      message: {
        id: newMessage.id,
        sender: "companion",
        text: newMessage.text,
        time: new Date(newMessage.createdAt).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })
      }
    });

  } catch (error) {
    console.error("Proactive Check Error:", error);
    return NextResponse.json({ hasNewMessage: false }, { status: 500 });
  }
}
