import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync } from 'fs';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const companionId = formData.get('companionId') as string;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const extension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${extension}`;
    
    // Windows와 Linux 공용 경로 처리
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
    }
    
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);
    const imageUrl = `/uploads/${fileName}`;

    console.log(`[Image Upload] Type: ${type}, ID: ${companionId}, URL: ${imageUrl}`);

    if (type === 'profile' && companionId) {
        // 프로필 업데이트 시 session.userId 체크 강화
        const updated = await prisma.companion.update({
            where: { 
              id: companionId,
              userId: session.userId 
            },
            data: { profileImage: imageUrl }
        });
        console.log(`[DB Update] Companion ${updated.id} profileImage set to ${imageUrl}`);
        return NextResponse.json({ success: true, imageUrl });
    } else if (companionId) {
        const saved = await prisma.message.create({
          data: {
            companionId,
            sender: "me",
            text: "",
            imageUrl,
            isRead: false
          }
        });
        return NextResponse.json({ success: true, imageUrl, id: saved.id });
    }

    return NextResponse.json({ success: true, imageUrl });

  } catch (error: any) {
    console.error("Image upload error:", error);
    return NextResponse.json({ error: "Failed to upload image: " + error.message }, { status: 500 });
  }
}
