import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const pathParam = request.nextUrl.searchParams.get('path');
    if (!pathParam) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    const projectRoot = path.resolve(process.cwd(), '..');
    const imagePath = path.join(projectRoot, pathParam);

    if (!imagePath.startsWith(projectRoot)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const buffer = await fs.readFile(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    const contentType =
      ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.gif' ? 'image/gif' : 'image/png';

    return new NextResponse(buffer, {
      headers: { 'Content-Type': contentType },
    });
  } catch {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }
}
