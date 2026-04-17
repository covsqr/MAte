import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const companionId = formData.get('companionId') as string;

    if (!file || !companionId) {
      return NextResponse.json({ error: "File and companionId are required" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const extension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${extension}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, buffer);
    const imageUrl = `/uploads/${fileName}`;

    // DB에 메시지 기록
    const saved = await prisma.message.create({
      data: {
        companionId,
        sender: "me",
        text: "", // 텍스트는 비어있음
        imageUrl,
        isRead: false
      }
    });

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      id: saved.id 
    });

  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
