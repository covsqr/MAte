import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { getCurrentActivity } from '@/lib/activities';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {
    const userId = cookies().get("userId")?.value;
    if (!userId) return NextResponse.json({ message: "No user" });

    const companion = await prisma.companion.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    if (!companion) return NextResponse.json({ message: "No companion" });

    const now = new Date();
    const lastInteraction = new Date(companion.lastInteractionAt);
    const diffMs = now.getTime() - lastInteraction.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // 선톡 발송 기준: 마지막 대화 후 3시간 이상 경과 (테스트를 위해 짧게 조정 가능)
    // 그리고 마지막 메시지가 사용자가 보낸 것이어야 함 (연속 선톡 방지)
    const lastMessage = await prisma.message.findFirst({
      where: { companionId: companion.id },
      orderBy: { createdAt: "desc" }
    });

    // 이미 선톡을 보냈거나, 대화한지 얼마 안 됐으면 패스
    if (!lastMessage || lastMessage.sender === "companion" || diffHours < 3) {
      return NextResponse.json({ hasNewMessage: false });
    }

    // 선톡 확률 (시간이 지날수록 증가, 여기선 단순화해서 3시간 넘으면 발송)
    // 실제 서비스에선 Math.random() < 0.3 등을 섞어서 무작위성 부여
    
    const activity = getCurrentActivity(now, companion.mbti);

    const systemPrompt = `너의 이름은 ${companion.name}야. 
현재 상황: ${activity.name} (${activity.description}), 기분: ${activity.mood}
나(사용자)와의 관계: ${companion.relationship}

[미션]
사용자가 한동안(약 ${Math.floor(diffHours)}시간) 연락이 없었어.
지금 너의 상황이나 기분에 맞춰서 사용자에게 먼저 선톡(먼저 연락하기)을 보내봐.
너의 성격(${companion.personality})을 잘 드러내야 해.

[지침]
1. 이모지 절대 금지.
2. 20대 카톡 말투 사용.
3. 아주 짧고 자연스럽게 (예: "뭐해?", "아 심심하다", "나 지금 알바하는데 손님 너무 많아ㅠㅠ")
4. 질문보다는 너의 현재 상태를 공유하거나 가볍게 말을 거는 느낌으로.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.9,
      max_tokens: 100,
    });

    const reply = response.choices[0].message.content || "뭐해?";

    // DB 저장 및 상호작용 시간 업데이트 (선톡도 상호작용으로 간주)
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
