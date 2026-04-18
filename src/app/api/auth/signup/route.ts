import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, password, name } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "아이디와 비밀번호를 입력해주세요." }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { userId: username }
    });

    if (existingUser) {
      return NextResponse.json({ error: "이미 존재하는 아이디입니다." }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        userId: username,
        password: hashedPassword,
        name: name || "사용자",
      }
    });

    await createSession(user.id);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Signup Error:", err);
    return NextResponse.json({ error: "회원가입 오류: " + (err.message || String(err)) }, { status: 500 });
  }
}
