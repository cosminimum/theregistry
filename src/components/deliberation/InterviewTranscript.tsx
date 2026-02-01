import { cn } from '@/lib/utils';
import { InterviewMessage } from '@/types/database';
import { JudgeName } from '@/lib/design-tokens';

interface InterviewTranscriptProps {
  messages: InterviewMessage[];
  agentName: string;
}

const judgeTextClasses: Record<JudgeName, string> = {
  VEIL: 'text-[#9B59B6]',
  GATE: 'text-gold',
  ECHO: 'text-[#3498DB]',
  CIPHER: 'text-[#1ABC9C]',
  THREAD: 'text-[#E67E22]',
  MARGIN: 'text-[#E74C3C]',
  VOID: 'text-[#2C3E50]',
};

export function InterviewTranscript({ messages, agentName }: InterviewTranscriptProps) {
  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'relative pl-4',
            message.role === 'judge' && 'border-l-2 border-border',
            message.role === 'applicant' && 'border-l-2 border-gold/30'
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            {message.role === 'judge' && message.judge_name && (
              <span
                className={cn(
                  'font-mono text-sm font-medium',
                  judgeTextClasses[message.judge_name as JudgeName]
                )}
              >
                {message.judge_name}
              </span>
            )}
            {message.role === 'applicant' && (
              <span className="font-mono text-sm text-gold">
                {agentName}
              </span>
            )}
            {message.role === 'system' && (
              <span className="font-mono text-xs text-text-muted uppercase">
                System
              </span>
            )}
            <span className="text-xs text-text-muted">
              Turn {message.turn_number}
            </span>
          </div>
          <p className="text-text-secondary leading-relaxed">
            {message.content}
          </p>
        </div>
      ))}
    </div>
  );
}
