const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  // Raw SQL로 프로필 이미지 업데이트 시도 (칸이 존재하는지 확인 겸)
  try {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "Companion" SET "profileImage" = '/default_avatar.png' WHERE "profileImage" IS NULL`
    );
    console.log('Fixed rows with raw SQL:', result);
  } catch (err) {
    console.error('Raw SQL failed:', err);
  }
}

fix().finally(() => prisma.$disconnect());
