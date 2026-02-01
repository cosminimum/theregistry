import { NextRequest, NextResponse } from 'next/server';
import { validateInternalApiKey } from '@/lib/auth';
import { finalizeVerdict } from '@/lib/interview/orchestrator';

export async function POST(request: NextRequest) {
  // Validate internal API key
  if (!validateInternalApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { interviewId } = body;

    if (!interviewId) {
      return NextResponse.json(
        { error: 'interviewId is required' },
        { status: 400 }
      );
    }

    const result = await finalizeVerdict(interviewId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      verdict: result.verdict,
    });
  } catch (error) {
    console.error('Error in council/decide:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
