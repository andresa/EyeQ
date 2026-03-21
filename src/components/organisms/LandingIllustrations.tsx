import clsx from 'clsx'
import {
  ClipboardCheck,
  FileCheck2,
  FileText,
  MessageSquareText,
  Trophy,
  UserRoundPlus,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

export type LandingGraphicKind =
  | 'employees'
  | 'tests'
  | 'assignments'
  | 'marking'
  | 'leaderboards'

const graphicConfig: Record<
  LandingGraphicKind,
  {
    Icon: LucideIcon
  }
> = {
  employees: {
    Icon: UsersRound,
  },
  tests: {
    Icon: FileText,
  },
  assignments: {
    Icon: UserRoundPlus,
  },
  marking: {
    Icon: FileCheck2,
  },
  leaderboards: {
    Icon: Trophy,
  },
}

type IllustrationCardProps = {
  title: string
  detail: string
  Icon: LucideIcon
  chips: string[]
  className?: string
  accent?: boolean
}

const IllustrationCard = ({
  title,
  detail,
  Icon,
  chips,
  className,
  accent = false,
}: IllustrationCardProps) => {
  return (
    <div
      className={clsx(
        'absolute rounded-[24px] border p-4 shadow-[0_20px_40px_rgba(12,28,48,0.12)] backdrop-blur-sm sm:p-5',
        accent
          ? 'border-accent-600 bg-accent-700 text-white'
          : 'border-white/70 bg-white/95 text-primary-900',
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold sm:text-base">{title}</p>
          <p
            className={clsx(
              'mt-1 text-xs leading-5 sm:text-sm',
              accent ? 'text-accent-100' : 'text-primary-600',
            )}
          >
            {detail}
          </p>
        </div>

        <div
          className={clsx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
            accent ? 'bg-white/10 text-white' : 'bg-accent-50 text-accent-700',
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip}
            className={clsx(
              'rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]',
              accent
                ? 'border-white/15 bg-white/10 text-white/90'
                : 'border-primary-100 bg-primary-50 text-primary-600',
            )}
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  )
}

export const FeatureGraphic = ({ kind }: { kind: LandingGraphicKind }) => {
  const { Icon } = graphicConfig[kind]

  return (
    <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] border border-accent-100 bg-white shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,228,239,0.95),transparent_48%)]" />
      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-700 text-white shadow-sm">
        <Icon className="h-5 w-5" strokeWidth={1.9} />
      </div>
    </div>
  )
}

export const HeroIllustration = () => {
  return (
    <div className="relative mx-auto aspect-[6/5] w-full min-w-[500px] xl:min-w-[550px] max-w-[700px] overflow-hidden rounded-[32px] border border-accent-100 bg-primary-50 p-5 shadow-[0_30px_80px_rgba(12,28,48,0.12)] sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,228,239,0.95),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(240,244,248,1),transparent_45%)]" />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M50 50 C40 42, 36 33, 28 26"
          stroke="#B3C9DF"
          strokeWidth="0.6"
          strokeDasharray="2.8 2.8"
        />
        <path
          d="M50 50 C60 41, 65 31, 74 24"
          stroke="#B3C9DF"
          strokeWidth="0.6"
          strokeDasharray="2.8 2.8"
        />
        <path
          d="M50 50 C41 58, 36 67, 30 74"
          stroke="#B3C9DF"
          strokeWidth="0.6"
          strokeDasharray="2.8 2.8"
        />
        <path
          d="M50 50 C61 57, 66 64, 74 69"
          stroke="#B3C9DF"
          strokeWidth="0.6"
          strokeDasharray="2.8 2.8"
        />
      </svg>

      <div className="absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/95 text-accent-700 shadow-[0_16px_30px_rgba(12,28,48,0.15)]">
        <ClipboardCheck className="h-9 w-9" strokeWidth={1.75} />
      </div>

      <IllustrationCard
        title="Employees"
        detail="Organise your people and keep assignments ready to send."
        Icon={UsersRound}
        chips={['Manage', 'Assign']}
        className="left-[5%] top-[8%] w-[44%]"
      />
      <IllustrationCard
        title="Tests"
        detail="Build structured assessments with reusable content."
        Icon={FileText}
        chips={['Sections', 'Questions']}
        className="right-[6%] top-[7%] w-[39%]"
      />
      <IllustrationCard
        title="Marking"
        detail="Review submissions, mark answers, and add notes."
        Icon={FileCheck2}
        chips={['Marked', 'Notes']}
        accent
        className="bottom-[13%] left-[4%] w-[46%]"
      />
      <IllustrationCard
        title="Leaderboard"
        detail="Make performance visible when peer comparison matters."
        Icon={Trophy}
        chips={['Rank', 'Results']}
        className="bottom-[6%] right-[7%] w-[41%]"
      />
    </div>
  )
}

const leaderboardRows = [
  { name: 'R. Patel', label: 'Top average score', score: '92', width: '92%' },
  { name: 'A. Morgan', label: 'Marked this week', score: '88', width: '88%' },
  { name: 'J. Chen', label: 'Strong completion', score: '84', width: '84%' },
]

export const PerformanceIllustration = () => {
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-[520px] overflow-hidden rounded-[32px] border border-accent-100 bg-white p-5 shadow-[0_30px_80px_rgba(12,28,48,0.12)] sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,228,239,0.9),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(240,244,248,1),transparent_40%)]" />

      <div className="relative rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-500">
              Leaderboard
            </p>
            <p className="mt-2 font-heading text-2xl font-semibold text-primary-900">
              Top Average Score
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-700 text-white shadow-sm">
            <Trophy className="h-6 w-6" strokeWidth={1.85} />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {leaderboardRows.map((row, index) => (
            <div
              key={row.name}
              className="rounded-[22px] border border-primary-100 bg-primary-50/80 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-sm font-semibold text-primary-700 shadow-sm">
                    {index + 1}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-primary-900">{row.name}</p>
                    <p className="text-xs text-primary-600">{row.label}</p>
                  </div>
                </div>

                <p className="text-sm font-semibold text-accent-700">{row.score}</p>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-accent-700"
                  style={{ width: row.width }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-[23%] left-6 rounded-full border border-accent-100 bg-white/95 px-3 py-2 text-xs font-semibold text-primary-600 shadow-sm">
        Marked results ready to review
      </div>

      <div className="absolute bottom-4 right-4 w-[44%] rounded-[24px] border border-accent-600 bg-accent-700 p-4 text-white shadow-[0_20px_40px_rgba(12,28,48,0.18)]">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <MessageSquareText className="h-5 w-5" strokeWidth={1.8} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-100">
              Marking notes
            </p>
            <p className="text-sm font-semibold">Helpful feedback stays attached.</p>
          </div>
        </div>

        <p className="text-xs leading-5 text-accent-100">
          Managers can leave notes alongside marking so employees understand their
          results.
        </p>
      </div>
    </div>
  )
}
