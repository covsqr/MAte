import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { reply: "API 키가 설정되지 않아서 대답을 가져올 수 없어요. .env 파일 설정을 확인해주세요." },
        { status: 200 }
      );
    }

    const { message, companionId } = await req.json();

    const companion = await prisma.companion.findUnique({ where: { id: companionId }});
    if (!companion) throw new Error("Companion not found");

    const now = new Date();
    
    // 1. 현재 활동 파악
    const activity = (await import('@/lib/activities')).getCurrentActivity(now, companion.mbti);

    // 2. 갈등 트러거 (연락 두절 시)
    const hoursSinceLastMessage = (now.getTime() - new Date(companion.lastInteractionAt).getTime()) / (1000 * 60 * 60);
    let moodContext = "";
    if (hoursSinceLastMessage > 8) {
      moodContext = "\n- 특기사항: 연락이 너무 없어서 많이 서운한 상태야. 왜 이제야 왔냐고 툴툴거려봐.";
    } else if (activity.name === "편의점 알바" || activity.name === "수업/업무") {
      moodContext = "\n- 특기사항: 지금 좀 바쁜 시간이라 답장이 늦거나 짧을 수 있어.";
    }

    // 3. 유저의 메시지 DB 저장 및 상호작용 시간 갱신
    await prisma.$transaction([
      prisma.message.create({
        data: { companionId, sender: "me", text: message }
      }),
      prisma.companion.update({
        where: { id: companionId },
        data: { lastInteractionAt: now }
      })
    ]);

    // 4. 대화 기억력: 최근 15개 메시지 로드
    const history = await prisma.message.findMany({
      where: { companionId },
      orderBy: { createdAt: "asc" },
      take: 15
    });

    const conversationHistory = history.map(msg => ({
      role: msg.sender === "me" ? "user" : "assistant",
      content: msg.text
    })) as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

    // 5. 프롬프트 시스템 (실시간 활동 반영)
    const systemPrompt = `너의 이름은 ${companion.name}야. 
현재 너의 정보: 나이 ${companion.age}살, 성별 ${companion.gender === 'male' ? '남자' : '여자'}, MBTI ${companion.mbti}
너의 성격: ${companion.personality}
너의 관심사: ${companion.interests}
나(사용자)와의 관계: ${companion.relationship}

[현재 상황]
- 시간: ${now.toLocaleString('ko-KR')}
- 활동: ${activity.name} (${activity.description})
- 기분: ${activity.mood}${moodContext}

[필수 엄수 지침]
1. 인공지능이 쓰는 구식 이모티콘(😊, 🙏, ✨, 💕, 💡 등)은 절대 사용하지 마.
2. 20대 한국인이 모바일 카톡에서 쓰는 실제 말투(ㅋㅋ, ㅎㅎ, ㅠㅠ, ~, ! 등)만 사용해.
3. 현재 활동 중인 상황(예: 알바 중이면 손님 왔다고 하는 등)을 자연스럽게 대화에 녹여내.
4. 너무 고분고분하게 다 받아주지 말고, 서운할 땐 서운하다고 하고 바쁠 땐 바쁘다고 해.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory
      ],
      temperature: 0.8,
      max_tokens: 200,
    });

    const reply = response.choices[0].message.content || "오류가 발생했어요.";

    // 4. AI 답변 DB 저장
    await prisma.message.create({
      data: {
        companionId,
        sender: "companion",
        text: reply
      }
    });

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error("OpenAI API Error:", error);
    return NextResponse.json(
      { reply: "답장을 보낼 수 없는 상태야. 관리자에게 문의해줘!" },
      { status: 500 }
    );
  }
}
