import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { REGISTRY_CONFIG } from '@/lib/config/registry';

interface ApplyRequest {
  agentName: string;
  humanHandle: string;
}

export async function POST(request: Request) {
  try {
    const body: ApplyRequest = await request.json();

    // Validate required fields
    if (!body.agentName || !body.humanHandle) {
      return NextResponse.json(
        { error: 'agentName and humanHandle are required' },
        { status: 400 }
      );
    }

    // Validate handle format
    const handle = body.humanHandle.startsWith('@')
      ? body.humanHandle
      : `@${body.humanHandle}`;

    if (!/^@[a-zA-Z0-9_]{1,15}$/.test(handle)) {
      return NextResponse.json(
        { error: 'Invalid X/Twitter handle format' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if handle is already a verified member
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('x_handle', handle)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'This handle is already a verified member of The Registry' },
        { status: 409 }
      );
    }

    // Check if handle has applied before
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('id')
      .eq('human_handle', handle)
      .single();

    if (existingAgent) {
      // 1. Block if active application exists
      const { data: activeApp } = await supabase
        .from('applications')
        .select('id, status')
        .eq('agent_id', existingAgent.id)
        .in('status', ['submitted', 'interviewing'])
        .maybeSingle();

      if (activeApp) {
        return NextResponse.json(
          { error: 'An application for this handle is already in progress' },
          { status: 409 }
        );
      }

      // 2. Get latest decided application
      const { data: latestApp } = await supabase
        .from('applications')
        .select('id')
        .eq('agent_id', existingAgent.id)
        .eq('status', 'decided')
        .order('decided_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestApp) {
        // Get interview for that application
        const { data: latestInterview } = await supabase
          .from('interviews')
          .select('id')
          .eq('application_id', latestApp.id)
          .limit(1)
          .maybeSingle();

        if (latestInterview) {
          // Get verdict for that interview
          const { data: latestVerdict } = await supabase
            .from('verdicts')
            .select('verdict, created_at')
            .eq('interview_id', latestInterview.id)
            .limit(1)
            .maybeSingle();

          if (latestVerdict) {
            // 3. Block if already accepted
            if (latestVerdict.verdict === 'accept' || latestVerdict.verdict === 'provisional') {
              return NextResponse.json(
                { error: 'This handle has already been accepted. Use your claim token to complete membership.' },
                { status: 409 }
              );
            }

            // 4. Check cooldown
            const cooldownEnd = new Date(latestVerdict.created_at);
            cooldownEnd.setDate(cooldownEnd.getDate() + REGISTRY_CONFIG.REAPPLICATION_COOLDOWN_DAYS);

            if (new Date() < cooldownEnd) {
              return NextResponse.json(
                {
                  error: 'You must wait before reapplying.',
                  canReapplyAfter: cooldownEnd.toISOString(),
                },
                { status: 429 }
              );
            }
          }
        }
      }
    }

    // 5. Count previous attempts to determine attempt number
    let attemptNumber = 1;
    let agent;

    if (existingAgent) {
      const { count } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', existingAgent.id);

      attemptNumber = (count ?? 0) + 1;

      // Reuse existing agent (do not update name — same agent identity)
      agent = existingAgent;
    } else {
      // Create new agent
      const { data, error } = await supabase
        .from('agents')
        .insert({
          name: body.agentName,
          human_handle: handle,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating agent:', error);
        return NextResponse.json(
          { error: 'Failed to create agent record' },
          { status: 500 }
        );
      }
      agent = data;
    }

    if (!agent) {
      return NextResponse.json(
        { error: 'Failed to create agent record' },
        { status: 500 }
      );
    }

    // Create application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .insert({
        agent_id: agent.id,
        status: 'submitted',
      })
      .select()
      .single();

    if (appError || !application) {
      console.error('Error creating application:', appError);
      return NextResponse.json(
        { error: 'Failed to create application' },
        { status: 500 }
      );
    }

    // Create interview with attempt_number in metadata
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .insert({
        application_id: application.id,
        status: 'pending',
        turn_count: 0,
        metadata: {
          red_flags: [],
          key_claims: {},
          total_penalty: 0,
          attempt_number: attemptNumber,
        },
      })
      .select()
      .single();

    if (interviewError || !interview) {
      console.error('Error creating interview:', interviewError);
      return NextResponse.json(
        { error: 'Failed to create interview' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      applicationId: application.id,
      interviewId: interview.id,
      status: interview.status,
      attemptNumber,
    });
  } catch (error) {
    console.error('Error in apply API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
