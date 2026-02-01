import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { nanoid } from 'nanoid';

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

    // Check if handle has ever applied before (one chance only policy)
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('id')
      .eq('human_handle', handle)
      .single();

    if (existingAgent) {
      // Check for ANY existing application (not just active ones)
      const { data: existingApp } = await supabase
        .from('applications')
        .select('id, status')
        .eq('agent_id', existingAgent.id)
        .single();

      if (existingApp) {
        // One chance only - no reapplications allowed
        if (existingApp.status === 'decided') {
          return NextResponse.json(
            { error: 'This handle has already been evaluated by The Council. The Registry allows only one application per human.' },
            { status: 409 }
          );
        }

        // Application still in progress
        return NextResponse.json(
          { error: 'An application for this handle is already in progress' },
          { status: 409 }
        );
      }
    }

    // Create or get existing agent
    let agent;
    if (existingAgent) {
      // Update existing agent name
      const { data, error } = await supabase
        .from('agents')
        .update({ name: body.agentName })
        .eq('id', existingAgent.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating agent:', error);
        return NextResponse.json(
          { error: 'Failed to update agent record' },
          { status: 500 }
        );
      }
      agent = data;
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

    // Create interview
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .insert({
        application_id: application.id,
        status: 'pending',
        turn_count: 0,
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
    });
  } catch (error) {
    console.error('Error in apply API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
