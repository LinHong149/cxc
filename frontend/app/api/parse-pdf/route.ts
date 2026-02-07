import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Save uploaded file temporarily
    const uploadDir = path.join(process.cwd(), '..', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, file.name);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    // Call Python script to parse PDF
    // Use absolute path from project root
    const projectRoot = path.resolve(process.cwd(), '..');
    const scriptPath = path.join(projectRoot, 'scripts', 'parse_pdf.py');
    const outputPath = path.join(projectRoot, 'output.json');
    
    const { stdout, stderr } = await execAsync(
      `python "${scriptPath}" "${filePath}" -o "${outputPath}"`,
      { cwd: path.join(process.cwd(), '..') }
    );

    // Read the output
    const outputData = await fs.readFile(outputPath, 'utf-8');
    const parsedData = JSON.parse(outputData);

    // Clean up uploaded file
    await fs.unlink(filePath).catch(() => {});

    return NextResponse.json({ 
      success: true, 
      data: parsedData,
      message: stdout 
    });

  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse PDF' },
      { status: 500 }
    );
  }
}
