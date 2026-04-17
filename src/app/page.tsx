import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ChatClient from "./ChatClient";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const userId = session.userId;

  const companion = await prisma.companion.findFirst({
    where: { userId: userId },
    orderBy: { createdAt: "desc" }
  });

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!companion || !user) {
    redirect("/setup");
  }

  // Load last 20 messages for UI initial render
  const lastMessages = await prisma.message.findMany({
    where: { companionId: companion.id },
    orderBy: { createdAt: "asc" },
    take: 20
  });

  return <ChatClient companion={companion} initialMessages={lastMessages} userPoints={user.points} />;
}
