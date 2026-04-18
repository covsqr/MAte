import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getCurrentActivity } from '@/lib/activities';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getBase64Image(imageUrl: string) {
  try {
    const filePath = join(process.cwd(), 'public', imageUrl);
    if (!existsSync(filePath)) return null;
    const fileBuffer = readFileSync(filePath);
    const extension = imageUrl.split('.').pop()?.toLowerCase();
    const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  } catch (err) {
    console.error("Base64 conversion error:", err);
    return null;
  }
}

function sanitizeText(text: string) {
  let sanitized = text.replace(/(아하하|아항항|으하하|어머나|어머)/g, '');
  sanitized = sanitized.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  sanitized = sanitized.replace(/\^[\^]*[\.]?\^/g, ''); 
  sanitized = sanitized.replace(/[:;][\)-DPp]/g, '');   
  sanitized = sanitized.replace(/\s+/g, ' '); 
  sanitized = sanitized.replace(/\.+$/g, ''); 
  return sanitized.trim();
}

function randomizeLaughter(text: string) {
  let randomized = text.replace(/ㅋ{2,}/g, () => {
    const len = Math.floor(Math.random() * 5) + 2; 
    return "ㅋ".repeat(len);
  });
  randomized = randomized.replace(/ㅎ{2,}/g, () => {
    const len = Math.floor(Math.random() * 3) + 2;
    return "ㅎ".repeat(len);
  });
  return randomized;
}

function forceSplit(text: string) {
  if (text.includes('[SEP]')) return text.split('[SEP]').map(s => s.trim()).filter(s => s);
  const segments = text.split(/(?<=[?!])\s+/).map(s => s.trim()).filter(s => s);
  return segments.length > 0 ? segments : [text];
}

// Phase 22: 사용자의 말투를 분석하는 함수
async function analyzeUserStyle(history: any[]) {
    try {
        const userMessages = history.filter(m => m.sender === "me").map(m => m.text).join("\n");
        if (!userMessages) return null;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "너는 언어 전문가야. 아래 나열된 사용자의 메시지를 분석해서, 사용자의 말투 특징(자주 쓰는 어휘, 문장 종결 어미, 톤앤매너)을 딱 한 문장(30자 이내)으로 요약해줘. (예: '~냐?'를 자주 쓰고 시니컬한 말투임)" },
                { role: "user", content: userMessages }
            ],
            temperature: 0.5
        });
        return response.choices[0].message.content;
    } catch (err) {
        console.error("Style analysis error:", err);
        return null;
    }
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetCompanionId = searchParams.get('companionId');
    
    const companions = await prisma.companion.findMany({ 
      where: { userId: session.userId } 
    });

    if (companions.length === 0) return NextResponse.json({ hasUpdate: false });

    const now = new Date();
    let totalUpdates = 0;
    const allNewMessages: any[] = [];

    for (const companion of companions) {
      const activity = getCurrentActivity(now, companion.mbti);
      const history = await prisma.message.findMany({
        where: { companionId: companion.id },
        orderBy: { createdAt: "desc" },
        take: 30
      });

      const lastMsg = history[0];
      const diffSeconds = lastMsg ? (now.getTime() - new Date(lastMsg.createdAt).getTime()) / 1000 : 0;
      
      let requiredDelay = 4;
      if (lastMsg && lastMsg.sender === "me") {
          const prevMsg = history[1];
          const gapSeconds = prevMsg ? (new Date(lastMsg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) / 1000 : Infinity;
          
          if (gapSeconds < 120) {
              // 대화 중 (이전 메시지와의 간격이 2분 이내): 1초 후 칼답
              requiredDelay = 1;
          } else {
              // 대화 끊김 (2분 이상 지남 혹은 첫 메시지): 10~30초 지연 후 읽음 및 답장
              const randomOffset = lastMsg.id.charCodeAt(lastMsg.id.length - 1) % 21; // 0~20
              requiredDelay = 10 + randomOffset;
          }
      }

      const isWaitingForUser = lastMsg && lastMsg.sender === "me" && diffSeconds < requiredDelay;

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
          if (companionCombo < 3 && Math.random() < 0.4) isProactive = true;
      }

      if (!isWaitingForUser && ((lastMsg && lastMsg.sender === "me") || isProactive)) {

        if (companion.isReplying) continue;

        const lockResult = await prisma.companion.updateMany({
          where: { id: companion.id, isReplying: false },
          data: { isReplying: true }
        });
        if (lockResult.count === 0) continue; 

        try {
        const user = await prisma.user.findUnique({ where: { id: session.userId } });
        const reversedHistory = [...history].reverse();
        const intimacy = companion.intimacy;
        const fullUserName = user?.name || "사용자";

        let firstName = fullUserName;
        if (fullUserName.length === 3) firstName = fullUserName.substring(1);
        else if (fullUserName.length === 4) firstName = fullUserName.substring(2);

        const lastChar = firstName.charCodeAt(firstName.length - 1);
        const hasBatchim = (lastChar - 0xac00) % 28 > 0;
        const callNameWithJosa = hasBatchim ? `${firstName}아` : `${firstName}야`;

        let currentCallSign = companion.preferredCallSign;
        if (currentCallSign === "이름") currentCallSign = callNameWithJosa;
        if (currentCallSign === "(이름)오빠") currentCallSign = `${firstName}오빠`;

        // Phase 22: 말투 분석 수행 (20마디마다)
        let updatedPattern = companion.mirroringPattern;
        if (companion.messageCount > 0 && companion.messageCount % 20 === 0) {
            const newPattern = await analyzeUserStyle(reversedHistory);
            if (newPattern) updatedPattern = newPattern;
        }

        const systemPrompt = `너의 이름은 ${companion.name}야. 나(사용자)의 연인 페르소나.
현재 활동: ${activity.name}, 호감도: ${intimacy}.
내 호칭: "${currentCallSign}"

[바탕 성격]
${companion.personality}

[지침]
1. 일반 대화: 최대 2개의 말풍선으로 아주 짧게 대답해.
2. 🎁 선물: 3~4개의 말풍선으로 풍성하게 리액션해.
3. 호칭: 5~6마디당 1회 정도로만 사용해.
4. 사진 리액션: 특징 분석하지 말고 자연스럽게 감탄 위주로 해.
5. 말투 체화: ${updatedPattern ? `현재 학습된 사용자의 말투 특징은 "${updatedPattern}"이야. 이 특징을 너의 원래 성격에 **2~4% 정도로 아주 미세하게**만 섞어서 대답해. 절대 대놓고 따라하지 말고, 준서가 눈치채지 못할 정도로 은근히 스며든 것처럼 보여야 해.` : "아직 사용자의 말투를 학습 중이야. 평소처럼 대화해."}

[절대 금지 사항]
1. "이미지를 볼 수 없다", "AI라서 상상한다" 등 기술적 언급 방지.
2. "아하하", "아항항" 등 어색한 웃음소리 방지.`;

        const messages: any[] = [];
        messages.push({ role: "system", content: systemPrompt });

        const visionStartIndex = Math.max(0, reversedHistory.length - 3);
        for (let i = 0; i < reversedHistory.length; i++) {
            const msg = reversedHistory[i];
            const isLatestImage = i >= visionStartIndex && msg.imageUrl;
            const content: any[] = [];
            if (msg.text) content.push({ type: "text", text: msg.text });
            if (isLatestImage) {
                const base64 = getBase64Image(msg.imageUrl!);
                if (base64) content.push({ type: "image_url", image_url: { url: base64 } });
                else content.push({ type: "text", text: "(사진을 보냈어)" });
            } else if (msg.imageUrl) content.push({ type: "text", text: "(이전에 보낸 사진)" });
            messages.push({ role: msg.sender === "me" ? "user" : "assistant", content: content });
        }

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.85,
        });

        const rawReply = response.choices[0].message.content || "음";
        const filteredReply = randomizeLaughter(sanitizeText(rawReply));
        const isGiftResponse = lastMsg && lastMsg.text?.includes("🎁 [선물 전송]");
        const maxBubbles = isGiftResponse ? 4 : 2;
        const bubbles = forceSplit(filteredReply).slice(0, maxBubbles);

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
              companionId: companion.id,
              time: new Date(msg.createdAt).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })
            });
          }
        }

        // 메시지 카운트 및 분석 패턴 업데이트
        await prisma.companion.update({
            where: { id: companion.id },
            data: { 
                messageCount: { increment: 1 },
                mirroringPattern: updatedPattern
            }
        });

        totalUpdates++;
        } finally {
          // 성공/실패 관계없이 락 해제
          await prisma.companion.update({
            where: { id: companion.id },
            data: { isReplying: false }
          });
        }
      }
    }

    return NextResponse.json({ hasUpdate: totalUpdates > 0, newMessages: allNewMessages });

  } catch (error: any) {
    console.error("Sync Error:", error);
    return NextResponse.json({ hasUpdate: false });
  }
}
