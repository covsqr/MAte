import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, createSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return NextResponse.json({ error: "존재하지 않는 아이디입니다." }, { status: 401 });
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
    }

    await createSession(user.id);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Login Error:", err);
    return NextResponse.json({ error: "로그인 처리 중 오류 발생" }, { status: 500 });
  }
}
