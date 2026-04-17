import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getCurrentActivity } from '@/lib/activities';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const companionId = searchParams.get('companionId');
    if (!companionId) return NextResponse.json({ error: "CompanionId required" }, { status: 400 });

    const companion = await prisma.companion.findFirst({ 
      where: { id: companionId, userId: session.userId } 
    });
    if (!companion) return NextResponse.json({ error: "Companion not found" }, { status: 404 });

    const now = new Date();
    const activity = getCurrentActivity(now, companion.mbti);

    // 1. 현재 DB의 읽음 상태 확인
    const unreadCount = await prisma.message.count({
      where: { companionId, sender: "me", isRead: false }
    });

    let readUpdated = false;

    // 안 읽은 게 있다면 즉시 읽음 처리
    if (unreadCount > 0) {
      await prisma.message.updateMany({
        where: { companionId, sender: "me", isRead: false },
        data: { isRead: true }
      });
      readUpdated = true;
    }

    // 2. 답변 생성 필요 여부 확인
    const lastMsg = await prisma.message.findFirst({
      where: { companionId },
      orderBy: { createdAt: "desc" }
    });

    // 마지막 메시지가 유저꺼라면 답장을 해야함
    if (lastMsg && lastMsg.sender === "me") {
      // 답변 생성 로직 진행
      const history = await prisma.message.findMany({
        where: { companionId },
        orderBy: { createdAt: "desc" },
        take: 30
      });

      const conversationHistory = history.reverse().map(msg => ({
        role: msg.sender === "me" ? "user" : "assistant",
        content: msg.text
      })) as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

      const systemPrompt = `너의 이름은 ${companion.name}야. 연인처럼 다정하게 답해줘. [SEP]를 써서 말풍선을 나눠줘.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...conversationHistory],
        temperature: 0.9,
      });

      const aiReply = response.choices[0].message.content || "응!";
      const bubbles = aiReply.split("[SEP]").map(b => b.trim()).filter(b => b);

      const savedMessages = [];
      for (const text of bubbles) {
        const msg = await prisma.message.create({
          data: { companionId, sender: "companion", text, isRead: true }
        });
        savedMessages.push({
          id: msg.id,
          sender: "companion",
          text: msg.text,
          time: new Date(msg.createdAt).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })
        });
      }

      return NextResponse.json({ 
        hasUpdate: true, 
        readUpdated: true, 
        newMessages: savedMessages 
      });
    }

    // 답장할 건 없지만, 만약 DB가 모두 읽음 상태라면 클라이언트에게도 업데이트 신호를 보냄
    // (이게 포인트입니다! 상태 꼬임 방지)
    if (readUpdated || unreadCount === 0) {
      return NextResponse.json({ 
        hasUpdate: true, 
        readUpdated: true, 
        newMessages: [] 
      });
    }

    return NextResponse.json({ hasUpdate: false });

  } catch (error: any) {
    console.error("Sync API Error:", error);
    return NextResponse.json({ hasUpdate: false });
  }
}
