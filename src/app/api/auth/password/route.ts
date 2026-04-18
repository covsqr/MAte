// 에디터 빨간 줄 제거용 리프레시 주석
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword, comparePassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 현재 비밀번호 확인
    const isCorrect = await comparePassword(currentPassword, user.password);
    if (!isCorrect) {
      return NextResponse.json({ error: "현재 비밀번호가 일치하지 않습니다." }, { status: 400 });
    }

    // 새 비밀번호 암호화 및 저장
    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: session.userId },
      data: { password: hashed }
    });

    return NextResponse.json({ success: true, message: "비밀번호가 성공적으로 변경되었습니다." });

  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json({ error: "비밀번호 변경 실패" }, { status: 500 });
  }
}
