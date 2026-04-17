import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, password, phone, name } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "아이디와 비밀번호를 입력해주세요." }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return NextResponse.json({ error: "이미 존재하는 아이디입니다." }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        phone,
        name: name || "사용자",
      }
    });

    await createSession(user.id);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Signup Error:", err);
    return NextResponse.json({ error: "회원가입 처리 중 오류 발생" }, { status: 500 });
  }
}
