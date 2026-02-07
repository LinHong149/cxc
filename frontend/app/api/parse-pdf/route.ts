import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const execAsync = promisify(exec);

// Check if we're in a Vercel environment
const isVercel = process.env.VERCEL === '1';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // On Vercel, use /tmp; locally, use project-relative path
    const uploadDir = isVercel 
      ? '/tmp/uploads'
      : path.join(process.cwd(), '..', 'uploads');
    
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, file.name);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    // Try to call Python script (only works locally, not on Vercel)
    let parsedData;
    
    if (isVercel) {
      // On Vercel, we can't execute Python scripts
      // Return a message that PDF parsing needs to be done via a separate backend service
      return NextResponse.json(
        { 
          error: 'PDF parsing is not available on Vercel. Please use a separate backend service or parse PDFs locally.',
          suggestion: 'Set up a backend API endpoint that handles PDF parsing, or use a service like AWS Lambda with Python runtime.'
        },
        { status: 501 }
      );
    }

    // Local execution - call Python script
    try {
      const projectRoot = path.resolve(process.cwd(), '..');
      const scriptPath = path.join(projectRoot, 'scripts', 'parse_pdf.py');
      const outputPath = path.join(projectRoot, 'output.json');
      
      const { stdout, stderr } = await execAsync(
        `python "${scriptPath}" "${filePath}" -o "${outputPath}"`,
        { cwd: projectRoot }
      );

      // Read the output
      const outputData = await fs.readFile(outputPath, 'utf-8');
      parsedData = JSON.parse(outputData);

      // Clean up uploaded file
      await fs.unlink(filePath).catch(() => {});

      return NextResponse.json({ 
        success: true, 
        data: parsedData,
        message: stdout 
      });
    } catch (pythonError: any) {
      // If Python execution fails, clean up and return error
      await fs.unlink(filePath).catch(() => {});
      throw pythonError;
    }

  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse PDF' },
      { status: 500 }
    );
  }
}
