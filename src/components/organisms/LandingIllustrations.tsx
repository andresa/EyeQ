import clsx from 'clsx'
import {
  BookOpen,
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
  | 'learning'

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
  learning: {
    Icon: BookOpen,
  },
}

type HeroCardProps = {
  title: string
  detail: string
  Icon: LucideIcon
  chips: string[]
  accent?: boolean
}

const HeroCard = ({ title, detail, Icon, chips, accent = false }: HeroCardProps) => {
  return (
    <div
      className={clsx(
        'rounded-[20px] border p-4 shadow-[0_12px_30px_rgba(12,28,48,0.1)] backdrop-blur-sm sm:rounded-[24px] sm:p-5',
        accent
          ? 'border-accent-600 bg-accent-700 text-white'
          : 'border-white/70 bg-white/95 text-primary-900',
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
        <div className="min-w-0">
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
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 sm:rounded-2xl',
            accent ? 'bg-white/10 text-white' : 'bg-accent-50 text-accent-700',
          )}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.8} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {chips.map((chip) => (
          <span
            key={chip}
            className={clsx(
              'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] sm:px-2.5 sm:py-1 sm:text-[11px]',
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
    <div className="relative mx-auto w-full max-w-[700px] overflow-hidden rounded-[24px] border border-accent-100 bg-primary-50 p-4 shadow-[0_30px_80px_rgba(12,28,48,0.12)] sm:rounded-[32px] sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,228,239,0.95),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(240,244,248,1),transparent_45%)]" />

      <div className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <HeroCard
          title="Employees"
          detail="Organise your people and keep them ready for training."
          Icon={UsersRound}
          chips={['Manage', 'Assign']}
        />
        <HeroCard
          title="Learning Resources"
          detail="Articles and flash cards to support ongoing training."
          Icon={BookOpen}
          chips={['Articles', 'Flash Cards']}
          accent
        />
        <HeroCard
          title="Tests"
          detail="Build structured assessments with reusable content."
          Icon={FileText}
          chips={['Sections', 'Questions']}
        />
        <HeroCard
          title="Marking"
          detail="Review submissions, mark answers, and add notes."
          Icon={FileCheck2}
          chips={['Marked', 'Notes']}
        />
        <div className="sm:col-span-2 flex justify-center">
          <div className="w-full sm:w-1/2">
            <HeroCard
              title="Leaderboard"
              detail="Make performance visible when peer comparison matters."
              Icon={Trophy}
              chips={['Rank', 'Results']}
            />
          </div>
        </div>
      </div>
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
    <div className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-[24px] border border-accent-100 bg-white p-4 shadow-[0_30px_80px_rgba(12,28,48,0.12)] sm:rounded-[32px] sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,228,239,0.9),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(240,244,248,1),transparent_40%)]" />

      <div className="relative z-10 space-y-3 sm:space-y-4">
        <div className="rounded-[20px] border border-white/80 bg-white/95 p-4 shadow-sm sm:rounded-[28px] sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-500">
                Leaderboard
              </p>
              <p className="mt-2 font-heading text-xl font-semibold text-primary-900 sm:text-2xl">
                Top Average Score
              </p>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-700 text-white shadow-sm sm:h-12 sm:w-12">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.85} />
            </div>
          </div>

          <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
            {leaderboardRows.map((row, index) => (
              <div
                key={row.name}
                className="rounded-[16px] border border-primary-100 bg-primary-50/80 p-2.5 sm:rounded-[22px] sm:p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-semibold text-primary-700 shadow-sm sm:h-8 sm:w-8 sm:rounded-xl sm:text-sm">
                      {index + 1}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-primary-900 sm:text-sm">
                        {row.name}
                      </p>
                      <p className="text-[11px] text-primary-600 sm:text-xs">
                        {row.label}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-accent-700 sm:text-sm">
                    {row.score}
                  </p>
                </div>

                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white sm:mt-3 sm:h-2">
                  <div
                    className="h-full rounded-full bg-accent-700"
                    style={{ width: row.width }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex items-center justify-center rounded-full border border-accent-100 bg-white/95 px-3 py-2 text-xs font-semibold text-primary-600 shadow-sm">
            Marked results ready to review
          </div>

          <div className="flex-1 rounded-[20px] border border-accent-600 bg-accent-700 p-4 text-white shadow-[0_20px_40px_rgba(12,28,48,0.18)] sm:rounded-[24px]">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:h-10 sm:w-10 sm:rounded-2xl">
                <MessageSquareText className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.8} />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-100 sm:text-xs">
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
      </div>
    </div>
  )
}
