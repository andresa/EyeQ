import { useEffect, useRef } from 'react'
import { Button, Typography } from 'antd'
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Trophy,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { EyeQLogo } from '../../components/molecules/EyeQLogo'
import {
  FeatureGraphic,
  HeroIllustration,
  PerformanceIllustration,
  type LandingGraphicKind,
} from '../../components/organisms/LandingIllustrations'

const loginButtonClass =
  '!rounded-full !border-accent-700 !bg-accent-700 text-white !px-5 !font-semibold hover:!border-accent-800 hover:!bg-accent-800 hover:!text-white'

const whiteButtonClass =
  '!rounded-full !border-white !bg-white !px-5 !font-semibold !text-accent-700 hover:!border-accent-50 hover:!bg-accent-50'

const featureCards: Array<{
  title: string
  description: string
  detailTags: string[]
  kind: LandingGraphicKind
}> = [
  {
    title: 'Keep employees organised',
    description:
      'Manage your employee list in one place so the right people are always ready for assignment.',
    detailTags: ['Employee records', 'Assignment-ready'],
    kind: 'employees',
  },
  {
    title: 'Build structured tests',
    description:
      'Create tests with clear sections, reusable questions, and content that fits your training process.',
    detailTags: ['Sections', 'Question types'],
    kind: 'tests',
  },
  {
    title: 'Assign with clarity',
    description:
      'Send tests to employees and keep progress visible from assignment through completion.',
    detailTags: ['Assigned tests', 'Status tracking'],
    kind: 'assignments',
  },
  {
    title: 'Mark and leave notes',
    description:
      'Review submissions, mark answers, and add notes so employees understand their results.',
    detailTags: ['Submissions', 'Manager feedback'],
    kind: 'marking',
  },
  {
    title: 'Enable leaderboards',
    description:
      'Give employees a clear view of how their results compare with peers when performance visibility matters.',
    detailTags: ['Rankings', 'Peer comparison'],
    kind: 'leaderboards',
  },
]

const workflowSteps: Array<{
  title: string
  description: string
  kind: LandingGraphicKind
}> = [
  {
    title: 'Create the test',
    description:
      'Managers build a structured test that reflects the training outcome they want to measure.',
    kind: 'tests',
  },
  {
    title: 'Assign it to employees',
    description:
      'The right employees receive the right test, with a workflow that is easy to track and repeat.',
    kind: 'assignments',
  },
  {
    title: 'Complete and submit',
    description:
      'Employees work through their assigned tests and submit once they have finished.',
    kind: 'employees',
  },
  {
    title: 'Mark and compare',
    description:
      'Managers review submissions, leave notes, and make results visible through leaderboards.',
    kind: 'marking',
  },
]

const heroHighlights: Array<{
  title: string
  description: string
  Icon: LucideIcon
}> = [
  {
    title: 'Manager-led control',
    description: 'Create tests, assign them, and mark submissions from one workflow.',
    Icon: ClipboardCheck,
  },
  {
    title: 'Employee-friendly delivery',
    description:
      'Employees see what is assigned, complete tests, and review marked results.',
    Icon: UsersRound,
  },
  {
    title: 'Visible performance',
    description: 'Leaderboards help teams understand how results compare across peers.',
    Icon: Trophy,
  },
]

const proofPoints = [
  'Results become visible after managers have completed the marking process.',
  'Notes stay attached to submissions so feedback remains clear and actionable.',
  'Leaderboards give employees a simple view of peer performance when enabled.',
]

type LandingSectionId = 'features' | 'workflow' | 'visibility'

const LandingPage = () => {
  const navigate = useNavigate()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLElement>(null)
  const workflowRef = useRef<HTMLElement>(null)
  const visibilityRef = useRef<HTMLElement>(null)

  const getSectionRef = (section: LandingSectionId) => {
    switch (section) {
      case 'features':
        return featuresRef
      case 'workflow':
        return workflowRef
      case 'visibility':
        return visibilityRef
    }
  }

  const scrollToSection = (
    section: LandingSectionId,
    options: { behavior?: ScrollBehavior; updateHash?: boolean } = {},
  ) => {
    const target = getSectionRef(section).current

    if (!target) return

    target.scrollIntoView({
      behavior: options.behavior ?? 'smooth',
      block: 'start',
    })

    if (options.updateHash !== false) {
      window.history.replaceState(null, '', `#${section}`)
    }
  }

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
    window.history.replaceState(null, '', window.location.pathname)
  }

  useEffect(() => {
    const handleHashScroll = (behavior: ScrollBehavior) => {
      const section = window.location.hash.replace('#', '') as LandingSectionId

      if (!section || !['features', 'workflow', 'visibility'].includes(section)) {
        return
      }

      requestAnimationFrame(() => {
        scrollToSection(section, { behavior, updateHash: false })
      })
    }

    handleHashScroll('auto')

    const onHashChange = () => handleHashScroll('smooth')
    window.addEventListener('hashchange', onHashChange)

    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return (
    <div
      ref={scrollContainerRef}
      className="h-screen overflow-y-auto overflow-x-hidden bg-white text-primary-900"
    >
      <div className="relative isolate min-h-full bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_top_left,rgba(240,244,248,1),transparent_35%),radial-gradient(circle_at_top_right,rgba(217,228,239,0.9),transparent_42%)]"
        />

        <header className="sticky top-0 z-20 border-b border-primary-100 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
            <Link
              to="/"
              className="flex items-center gap-3 text-primary-900"
              onClick={scrollToTop}
            >
              <EyeQLogo size="small" />
              <div>
                <p className="font-heading text-lg font-semibold">EyeQ</p>
                <p className="text-sm text-primary-500">
                  Staff training for modern teams
                </p>
              </div>
            </Link>

            <nav className="hidden items-center gap-8 text-sm text-primary-600 md:flex">
              <button
                type="button"
                className="transition hover:text-accent-700"
                onClick={() => scrollToSection('features')}
              >
                Features
              </button>
              <button
                type="button"
                className="transition hover:text-accent-700"
                onClick={() => scrollToSection('workflow')}
              >
                Workflow
              </button>
              <button
                type="button"
                className="transition hover:text-accent-700"
                onClick={() => scrollToSection('visibility')}
              >
                Visibility
              </button>
            </nav>

            <Button
              size="large"
              className={loginButtonClass}
              onClick={() => navigate('/login')}
            >
              Log In
            </Button>
          </div>
        </header>

        <main>
          <section className="relative">
            {/* <div className="mx-auto grid max-w-[90rem] gap-16 px-6 py-20 xl:grid-cols-[1.05fr_0.95fr] xl:items-center xl:px-8 xl:py-24"> */}
            <div className="mx-auto flex max-w-[90rem] flex-col items-center justify-center gap-16 px-6 py-20 xl:grid xl:grid-cols-[1.05fr_0.95fr] xl:items-center xl:px-8 xl:py-24">
              <div>
                <div className="inline-flex rounded-full border border-accent-100 bg-accent-50 px-4 py-2 text-sm font-semibold text-accent-700">
                  Training workflows made easy
                </div>

                <Typography.Title
                  level={1}
                  className="!mt-6 !max-w-3xl !text-5xl !font-semibold !leading-tight !tracking-tight md:!text-6xl text-center xl:text-left"
                >
                  Run staff training with clear assignments, consistent marking, and
                  visible results.
                </Typography.Title>

                <Typography.Paragraph className="!mt-6 !max-w-2xl !text-lg !leading-8 !text-primary-600 text-center xl:text-left">
                  EyeQ gives managers one place to organise employees, build tests, assign
                  them with confidence, mark submissions with notes, and enable
                  leaderboards that show employees how their results compare with peers.
                </Typography.Paragraph>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center justify-center xl:justify-start">
                  <Button
                    size="large"
                    className={loginButtonClass}
                    icon={<ArrowRight className="h-4 w-4" />}
                    onClick={() => navigate('/login')}
                  >
                    Log In
                  </Button>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-primary-200 px-5 py-3 text-sm font-semibold text-primary-700 transition hover:border-accent-200 hover:text-accent-700"
                    onClick={() => scrollToSection('workflow')}
                  >
                    See how it works
                  </button>
                </div>

                <div className="flex flex-col justify-center xl:items-start items-center mt-8 space-y-3">
                  <div className="flex items-start gap-3 text-primary-700">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-700" />
                    <span>
                      Managers control the full training workflow from test setup to
                      marked results.
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-primary-700">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-700" />
                    <span>
                      Employees get a clear experience for completing tests and reviewing
                      feedback.
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-primary-700">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-700" />
                    <span>
                      Leaderboards add performance visibility without leaving the training
                      workflow.
                    </span>
                  </div>
                </div>
              </div>
              <HeroIllustration />
            </div>
          </section>

          <section className="border-y border-primary-100 bg-primary-50/70">
            <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
              <div className="grid gap-4 md:grid-cols-3">
                {heroHighlights.map(({ title, description, Icon }) => (
                  <div
                    key={title}
                    className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-sm"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-700">
                      <Icon className="h-6 w-6" strokeWidth={1.8} />
                    </div>

                    <p className="text-lg font-semibold text-primary-900">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-primary-600">
                      {description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section ref={featuresRef} id="features" className="scroll-mt-24">
            <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-700">
                  Feature Overview
                </p>
                <Typography.Title level={2} className="!mt-4 !text-4xl !font-semibold">
                  Everything needed to manage the staff training cycle.
                </Typography.Title>
                <Typography.Paragraph className="!mt-4 !text-lg !leading-8 !text-primary-600">
                  EyeQ is built around the workflow your teams already follow: organise
                  employees, create tests, assign them, mark submissions, and make
                  performance easy to understand.
                </Typography.Paragraph>
              </div>

              <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {featureCards.map(({ title, description, detailTags, kind }) => (
                  <div
                    key={title}
                    className="rounded-[28px] border border-primary-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(12,28,48,0.08)]"
                  >
                    <FeatureGraphic kind={kind} />

                    <p className="mt-6 text-xl font-semibold text-primary-900">{title}</p>
                    <p className="mt-3 text-base leading-7 text-primary-600">
                      {description}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {detailTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-accent-100 bg-accent-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-accent-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            ref={workflowRef}
            id="workflow"
            className="scroll-mt-24 border-y border-primary-100 bg-primary-50/80"
          >
            <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-700">
                  Workflow
                </p>
                <Typography.Title level={2} className="!mt-4 !text-4xl !font-semibold">
                  Designed for managers, clear for employees.
                </Typography.Title>
                <Typography.Paragraph className="!mt-4 !text-lg !leading-8 !text-primary-600">
                  The experience stays focused from start to finish, so training is easier
                  to deliver and easier to review.
                </Typography.Paragraph>
              </div>

              <div className="mt-12 grid gap-5 lg:grid-cols-4">
                {workflowSteps.map(({ title, description, kind }, index) => (
                  <div
                    key={title}
                    className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-sm"
                  >
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-500">
                        0{index + 1}
                      </span>
                      <FeatureGraphic kind={kind} />
                    </div>

                    <p className="text-xl font-semibold text-primary-900">{title}</p>
                    <p className="mt-3 text-base leading-7 text-primary-600">
                      {description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section ref={visibilityRef} id="visibility" className="scroll-mt-24">
            <div className="mx-auto grid max-w-7xl gap-14 px-6 py-24 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8">
              <div>
                <PerformanceIllustration />
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-700">
                  Visibility After Marking
                </p>
                <Typography.Title level={2} className="!mt-4 !text-4xl !font-semibold">
                  Make training progress easier to understand.
                </Typography.Title>
                <Typography.Paragraph className="!mt-4 !text-lg !leading-8 !text-primary-600">
                  Once submissions have been reviewed, employees can see marked results
                  and compare performance through leaderboards. Managers stay in control
                  of the process while teams get better visibility.
                </Typography.Paragraph>

                <div className="mt-8 space-y-4">
                  {proofPoints.map((point) => (
                    <div
                      key={point}
                      className="flex items-start gap-3 rounded-2xl bg-primary-50 p-4"
                    >
                      <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-700" />
                      <p className="text-base leading-7 text-primary-700">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="pb-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="relative overflow-hidden rounded-[36px] bg-accent-700 px-8 py-12 text-white shadow-[0_30px_80px_rgba(12,28,48,0.2)] md:px-12 md:py-14">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(12,28,48,0.3),transparent_42%)]"
                />

                <div className="relative flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="mb-6 flex items-center gap-4">
                      <div className="rounded-2xl border border-white/10 bg-white/10 p-2">
                        <EyeQLogo size="small" color="white" />
                      </div>

                      <div>
                        <p className="font-heading text-xl font-semibold">EyeQ</p>
                        <p className="text-sm text-accent-100">
                          One clear workflow for staff training and results
                        </p>
                      </div>
                    </div>

                    <Typography.Title
                      level={2}
                      className="!text-4xl !font-semibold !leading-tight !text-white"
                    >
                      Bring staff training, marking, and leaderboards into one calm
                      workflow.
                    </Typography.Title>

                    <Typography.Paragraph className="!mt-4 !max-w-xl !text-lg !leading-8 !text-accent-100">
                      Sign in to continue managing employee training, reviewing
                      submissions, and keeping performance visible in EyeQ.
                    </Typography.Paragraph>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
                    <Button
                      size="large"
                      className={whiteButtonClass}
                      onClick={() => navigate('/login')}
                    >
                      Log In
                    </Button>

                    <p className="text-sm text-accent-100">
                      Existing users sign in at{' '}
                      <span className="font-semibold text-white">/login</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default LandingPage
