import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ChatClient from "./ChatClient";

export default async function Home() {
  const cookieStore = cookies();
  const userId = cookieStore.get("userId")?.value;

  if (!userId) {
    redirect("/setup");
  }

  const companion = await prisma.companion.findFirst({
    where: { userId: userId },
    orderBy: { createdAt: "desc" }
  });

  if (!companion) {
    redirect("/setup");
  }

  // Load last 20 messages for UI initial render
  const lastMessages = await prisma.message.findMany({
    where: { companionId: companion.id },
    orderBy: { createdAt: "asc" },
    take: 20
  });

  return <ChatClient companion={companion} initialMessages={lastMessages} />;
}
