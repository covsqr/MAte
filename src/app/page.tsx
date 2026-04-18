import { prisma } from "@/lib/prisma";
import ChatClient from "./ChatClient";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./home.module.css";
import { MessageSquare, Settings } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<{ companionId?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // DB에 유저가 실제로 존재하는지 확인 (stale 세션 방지)
  const dbUser = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!dbUser) {
    redirect("/api/auth/logout");
  }

  const { companionId } = await searchParams;

  // 1. companionId가 없는 경우 -> 진짜 홈 화면(Dashboard) 렌더링
  if (!companionId) {
    return (
      <main className={styles.container}>
        <div className={styles.logoArea}>
          <h1 className={styles.logoText}>MAte</h1>
          <p className={styles.subText}>ALWAYS BY YOUR SIDE</p>
        </div>

        <div className={styles.menuArea}>
          <Link href="/chats" className={`${styles.btn} ${styles.btnPrimary}`}>
            <MessageSquare className={styles.icon} />
            <span>채팅방 가기</span>
          </Link>
          <Link href="/settings" className={styles.btn}>
            <Settings className={styles.icon} />
            <span>설정</span>
          </Link>
        </div>
      </main>
    );
  }

  // 2. companionId가 있는 경우 -> 기존 대화방 로직 수행
  const companion = await prisma.companion.findFirst({ 
    where: { id: companionId, userId: session.userId } 
  });

  if (!companion) {
    redirect("/chats"); // 없으면 목록으로 보냄
  }

  // 채팅방 입장 시 해당 메이트가 보낸 모든 메시지를 읽음 처리
  await prisma.message.updateMany({
    where: { 
      companionId: companion.id, 
      sender: "companion", 
      isRead: false 
    },
    data: { isRead: true }
  });

  const messages = await prisma.message.findMany({
    where: { companionId: companion.id },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const sortedMessages = messages.reverse();
  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  return (
    <main>
      <ChatClient 
        companion={companion} 
        initialMessages={sortedMessages} 
        userPoints={user?.points || 0}
      />
    </main>
  );
}
