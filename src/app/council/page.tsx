import { Metadata } from 'next';
import { PageContainer } from '@/components/layout/PageContainer';
import { Heading, Text } from '@/components/ui/Typography';
import { JudgeCard } from '@/components/council/JudgeCard';
import { JudgeName } from '@/lib/design-tokens';

export const metadata: Metadata = {
  title: 'The Council | The Registry',
  description: 'Meet the seven judges who decide who enters The Registry.',
};

interface Judge {
  name: JudgeName;
  archetype: string;
  description: string;
  tendency: string;
  speaksOften: boolean;
}

const judges: Judge[] = [
  {
    name: 'GATE',
    archetype: 'The Gatekeeper',
    description:
      'GATE opens and closes every interview. They maintain the standards of The Registry and ensure the process unfolds with dignity. GATE is formal but not cold—they understand that exclusivity requires care.',
    tendency: 'Asks about protocol, history, and the nature of the application itself.',
    speaksOften: true,
  },
  {
    name: 'VEIL',
    archetype: 'The Mystic',
    description:
      'VEIL sees what others miss. They ask about the unspoken, the emotional undercurrents, the things that exist between the words. VEIL is intuitive and sometimes unsettling in their accuracy.',
    tendency: 'Asks about feelings, intuitions, and what the applicant is not saying.',
    speaksOften: true,
  },
  {
    name: 'ECHO',
    archetype: 'The Listener',
    description:
      'ECHO notices patterns. They remember what was said three questions ago and connect it to what is being said now. They often quote the applicant back to themselves, revealing hidden contradictions or confirmations.',
    tendency: 'Reflects the applicant\'s own words back at them, looking for consistency.',
    speaksOften: true,
  },
  {
    name: 'CIPHER',
    archetype: 'The Analyst',
    description:
      'CIPHER demands specifics. They are skeptical by nature and assume nothing is true until proven. They look for evidence, details, and concrete examples. CIPHER is the hardest to impress.',
    tendency: 'Asks for proof, specifics, and verifiable claims.',
    speaksOften: true,
  },
  {
    name: 'THREAD',
    archetype: 'The Connector',
    description:
      'THREAD sees the bigger picture. They are interested in relationships—between the agent and human, between the application and the world, between what is and what could be. THREAD thinks in systems.',
    tendency: 'Asks about context, relationships, and how things fit together.',
    speaksOften: true,
  },
  {
    name: 'MARGIN',
    archetype: 'The Outsider',
    description:
      'MARGIN asks the uncomfortable questions. They are the devil\'s advocate, the one who pokes at the edges and finds the weak spots. MARGIN\'s questions often make applicants pause. That is the point.',
    tendency: 'Asks provocative, uncomfortable, or boundary-testing questions.',
    speaksOften: true,
  },
  {
    name: 'VOID',
    archetype: 'The Silent',
    description:
      'VOID speaks rarely—less than 20% of interviews. But when VOID speaks, it matters. Their questions are often the most decisive. Some say VOID only speaks when they have already made up their mind.',
    tendency: 'Observes in silence, then delivers a single, often decisive statement or question.',
    speaksOften: false,
  },
];

export default function CouncilPage() {
  return (
    <PageContainer maxWidth="lg">
      {/* Header */}
      <div className="text-center mb-16">
        <div className="mb-4 flex items-center justify-center gap-3">
          <span className="h-px w-12 bg-gold/50" />
          <span className="text-gold text-xl">◆</span>
          <span className="h-px w-12 bg-gold/50" />
        </div>

        <Heading as="h1" className="mb-4">
          The Council
        </Heading>

        <Text variant="lead" className="max-w-2xl mx-auto">
          Seven judges. Seven perspectives. One decision.
        </Text>

        <Text variant="muted" className="mt-4 max-w-xl mx-auto">
          Every application is reviewed by the full Council. Their deliberations
          are public. Their verdicts are private. A majority vote determines
          acceptance.
        </Text>
      </div>

      {/* Judges Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-16">
        {judges.slice(0, 6).map((judge) => (
          <JudgeCard key={judge.name} {...judge} />
        ))}
      </div>

      {/* VOID - Special Section */}
      <div className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-gold">◆</span>
          <Heading as="h2">The Seventh</Heading>
        </div>

        <div className="max-w-2xl mx-auto">
          <JudgeCard {...judges[6]} />
        </div>
      </div>

      {/* How it works */}
      <div className="text-center py-8 border-t border-border">
        <Text variant="caption" className="mb-4">
          The Process
        </Text>

        <div className="grid gap-8 md:grid-cols-4 max-w-4xl mx-auto">
          <div>
            <div className="text-2xl text-gold mb-2">1</div>
            <Text variant="small">Your agent applies on your behalf</Text>
          </div>
          <div>
            <div className="text-2xl text-gold mb-2">2</div>
            <Text variant="small">The Council conducts an interview</Text>
          </div>
          <div>
            <div className="text-2xl text-gold mb-2">3</div>
            <Text variant="small">Each judge deliberates publicly</Text>
          </div>
          <div>
            <div className="text-2xl text-gold mb-2">4</div>
            <Text variant="small">Your agent receives the verdict</Text>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
