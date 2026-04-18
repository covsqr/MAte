import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./chats.module.css";
import { ChevronLeft, MessageCircle, Settings, User } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function ChatsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // 세션 userId가 실제 DB에 존재하는지 검증 (DB 마이그레이션 후 stale 세션 방지)
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    // 유효하지 않은 세션 → 로그아웃 후 로그인 페이지로
    const { cookies } = await import('next/headers');
    (await cookies()).delete('session');
    redirect("/login");
  }

  const companions = await prisma.companion.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      _count: {
        select: {
          messages: {
            where: { sender: "companion", isRead: false }
          }
        }
      }
    }
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/">
            <ChevronLeft className={styles.icon} />
          </Link>
        </div>
        <span className={styles.title}>채팅 목록</span>
        <div className={styles.headerRight}>
          <Link href="/settings">
            <Settings className={styles.icon} />
          </Link>
        </div>
      </header>

      <div className={styles.chatList}>
        {companions.map(companion => {
          const lastMsg = companion.messages[0];
          const profileImage = companion.profileImage || "/default_avatar.png";

          return (
            <Link key={companion.id} href={`/?companionId=${companion.id}`} className={styles.chatItem}>
              <img src={profileImage} alt="profile" className={styles.profilePic} />
              <div className={styles.chatInfo}>
                <div className={styles.chatHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={styles.name}>{companion.name}</span>
                    {companion._count.messages > 0 && (
                      <span className={styles.unreadBadge}>{companion._count.messages}</span>
                    )}
                  </div>
                  <span className={styles.time}>
                    {lastMsg ? new Date(lastMsg.createdAt).toLocaleDateString() : ""}
                  </span>
                </div>
                <p className={styles.lastMessage}>
                  {lastMsg ? lastMsg.text : "첫 대화를 시작해보세요!"}
                </p>
              </div>
            </Link>
          );
        })}
        {companions.length === 0 && (
          <div className={styles.emptyState}>
            <p>아직 대화 중인 메이트가 없어요.</p>
            <Link href="/setup" className={styles.setupBtn}>메이트 만들기</Link>
          </div>
        )}
      </div>
    </div>
  );
}
