import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });

    // 유저 프로필 업데이트
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: data.userName,
        age: parseInt(data.userAge) || 20,
        location: data.userLocation,
        hobbies: data.userHobbies
      }
    });

    // 메이트 생성
    const companion = await prisma.companion.create({
      data: {
        userId: session.userId,
        name: data.name,
        age: parseInt(data.age) || 20,
        gender: data.gender,
        mbti: data.mbti,
        personality: data.personality,
        interests: data.interests,
        relationship: data.relationship,
        birthday: data.birthday,
        speechStyle: data.speechStyle || "반말",
        preferredCallSign: data.preferredCallSign || "이름",
        intimacy: data.relationship === '오랜 연인' ? 150 : (data.relationship === '연인' ? 80 : (data.relationship === '썸' ? 30 : 0)),
        // 연인이면 랜덤한 과거 날짜로 설정
        startedAt: (data.relationship === '연인' || data.relationship === '오랜 연인')
          ? new Date(Date.now() - (Math.floor(Math.random() * 300) + 30) * 24 * 60 * 60 * 1000)
          : new Date(),
      }
    });

    return NextResponse.json({ success: true, companionId: companion.id });

  } catch (err: any) {
    console.error("Setup API Error:", err);
    return NextResponse.json({ error: "Failed to setup profile" }, { status: 500 });
  }
}
