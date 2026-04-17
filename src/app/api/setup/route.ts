import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // 임시 회원가입(간이 로그인)용 이메일
    const email = `user_${Date.now()}@example.com`;

    const user = await prisma.user.create({
      data: {
        email: email,
        name: data.userName,
      }
    });

    const companion = await prisma.companion.create({
      data: {
        userId: user.id,
        name: data.name,
        age: parseInt(data.age) || 20,
        gender: data.gender,
        mbti: data.mbti,
        personality: data.personality,
        interests: data.interests,
        relationship: data.relationship,
      }
    });

    cookies().set("userId", user.id, { 
      httpOnly: true, 
      path: "/",
      maxAge: 60 * 60 * 24 * 365 // 1년 유지
    });

    return NextResponse.json({ success: true, companionId: companion.id });

  } catch (err: any) {
    console.error("Setup API Error:", err);
    return NextResponse.json({ error: "Failed to setup profile" }, { status: 500 });
  }
}
