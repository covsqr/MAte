const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const companions = await prisma.companion.findMany({
    select: { id: true, name: true, profileImage: true, userId: true }
  });
  console.log('Companions in DB:', JSON.stringify(companions, null, 2));
  
  const users = await prisma.user.findMany({
    select: { id: true, userId: true, name: true }
  });
  console.log('Users in DB:', JSON.stringify(users, null, 2));
}

check().catch(console.error);
