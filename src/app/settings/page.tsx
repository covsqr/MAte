import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      companions: true
    }
  });

  if (!user) redirect("/login");

  return (
    <SettingsClient 
      user={JSON.parse(JSON.stringify(user))} 
      companions={JSON.parse(JSON.stringify(user.companions))}
    />
  );
}
