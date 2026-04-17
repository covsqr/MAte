import { prisma } from "@/lib/prisma";
import ChatClient from "./ChatClient";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home({ searchParams }: { searchParams: Promise<{ companionId?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { companionId } = await searchParams;

  // 특정 세션Id가 있으면 그것을, 없으면 가장 최근 메이트를 불러옴
  const companion = companionId 
    ? await prisma.companion.findFirst({ where: { id: companionId, userId: session.userId } })
    : await prisma.companion.findFirst({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" }
      });

  if (!companion) {
    redirect("/setup");
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

  // 최신 50개를 가져왔으므로 다시 시간순(asc)으로 뒤집어서 전달
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
