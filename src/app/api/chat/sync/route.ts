import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getCurrentActivity } from '@/lib/activities';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function sanitizeText(text: string) {
  let sanitized = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  sanitized = sanitized.replace(/\^[\^]*[\.]?\^/g, ''); 
  sanitized = sanitized.replace(/[:;][\)-DPp]/g, '');   
  sanitized = sanitized.replace(/\.+$/g, ''); 
  return sanitized.trim();
}

function forceSplit(text: string) {
  if (text.includes('[SEP]')) return text.split('[SEP]').map(s => s.trim()).filter(s => s);
  const segments = text.split(/(?<=[?!])\s+/).map(s => s.trim()).filter(s => s);
  return segments.length > 0 ? segments : [text];
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetCompanionId = searchParams.get('companionId');
    
    const companions = targetCompanionId 
      ? await prisma.companion.findMany({ where: { id: targetCompanionId, userId: session.userId } })
      : await prisma.companion.findMany({ where: { userId: session.userId } });

    if (companions.length === 0) return NextResponse.json({ hasUpdate: false });

    const now = new Date();
    let totalUpdates = 0;
    const allNewMessages: any[] = [];

    for (const companion of companions) {
      const activity = getCurrentActivity(now, companion.mbti);
      
      const history = await prisma.message.findMany({
        where: { companionId: companion.id },
        orderBy: { createdAt: "desc" },
        take: 20
      });

      const lastMsg = history[0];
      const diffSeconds = lastMsg ? (now.getTime() - new Date(lastMsg.createdAt).getTime()) / 1000 : 0;
      
      // Phase 16: 생각할 시간 부여 (Thoughtful Wait)
      // 사용자가 마지막 메시지(me)를 보낸 후 4초가 지나지 않았다면 아직 입력을 기다림
      const isWaitingForUser = lastMsg && lastMsg.sender === "me" && diffSeconds < 4;

      // 안 읽은 메시지 읽음 처리 (생각 시간이 끝났을 때만)
      if (targetCompanionId === companion.id && !isWaitingForUser) {
        await prisma.message.updateMany({
          where: { companionId: companion.id, sender: "me", isRead: false },
          data: { isRead: true }
        });
      }

      let isProactive = false;
      if (lastMsg && lastMsg.sender === "companion" && diffSeconds > 30) {
          let companionCombo = 0;
          for (const m of history) {
              if (m.sender === "companion") companionCombo++;
              else break;
          }
          if (companionCombo < 3) isProactive = true;
      }

      // 답장 생성 조건: 대기 시간이 지났고 (유저가 보냈거나 선톡 타이밍이거나)
      if (!isWaitingForUser && ((lastMsg && lastMsg.sender === "me") || isProactive)) {
        const user = await prisma.user.findUnique({ where: { id: session.userId } });
        const reversedHistory = [...history].reverse();
        const messages: any[] = [];
        const intimacy = companion.intimacy;
        const userName = user?.name || "사용자";

        let currentCallSign = companion.preferredCallSign;
        if (currentCallSign === "이름") currentCallSign = `${userName}야`;
        if (currentCallSign === "(이름)오빠") currentCallSign = `${userName}오빠`;

        const systemPrompt = `너의 이름은 ${companion.name}야. 나(사용자)의 연인 페르소나.
현재 활동: ${activity.name}, 호감도: ${intimacy}.
호칭 고정: "${currentCallSign}"

[중요 지침]
1. 의성어(ㅋㅋㅋ, ㅎㅎㅎ)는 4문장당 1번 꼴(25%)로만 써. 남발 절대 금지.
2. 이모지 사용 절대 금지. 문장 끝 온점(.) 절대 금지. [SEP] 분할 필수.
3. 🎁 [선물 전송] 감지 시: 짧고 쿨하게 "고마워 ㅋㅋㅋ" 정도로만 반응해. 비서처럼 길게 감동받지 마.

[말투 예시]
- "오 ㅋㅋㅋ" [SEP] "맛있겠당"
- "나 아까 일어났어" [SEP] "배고픈데 머먹지"`;

        messages.push({ role: "system", content: systemPrompt });
        for (const msg of reversedHistory) {
            messages.push({
              role: msg.sender === "me" ? "user" : "assistant",
              content: msg.text || (msg.imageUrl ? "사진을 보냈어." : "")
            });
        }

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.85,
        });

        const rawReply = response.choices[0].message.content || "음";
        const filteredReply = sanitizeText(rawReply);
        const bubbles = forceSplit(filteredReply);

        for (const text of bubbles) {
          const isMsgRead = targetCompanionId === companion.id;
          const msg = await prisma.message.create({
            data: { 
              companionId: companion.id, 
              sender: "companion", 
              text, 
              isRead: isMsgRead 
            }
          });
          
          if (targetCompanionId === companion.id) {
            allNewMessages.push({
              id: msg.id,
              sender: "companion",
              text: msg.text,
              time: new Date(msg.createdAt).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })
            });
          }
        }
        totalUpdates++;
      }
    }

    return NextResponse.json({ hasUpdate: totalUpdates > 0, newMessages: allNewMessages });

  } catch (error: any) {
    console.error("Sync Error with Wait Time:", error);
    return NextResponse.json({ hasUpdate: false });
  }
}
