import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // File upload is accepted but not parsed - user will toggle between output.json and output2.json
    // Just return success and let the frontend redirect to results page
    return NextResponse.json({ 
      success: true, 
      message: 'File uploaded. Use the toggle button on the results page to switch between output.json and output2.json'
    });

  } catch (error: any) {
    console.error('Error processing files:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process files' },
      { status: 500 }
    );
  }
}
