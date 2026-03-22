import { useCallback, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, Modal, Spin, Tabs, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
import EmployeeLayout from '../../layouts/EmployeeLayout'
import StandardPageHeading from '../../components/molecules/StandardPageHeading'
import QuestionImage from '../../components/atoms/QuestionImage'
import Selection from '../../components/atoms/Selection'
import RichText from '../../components/atoms/RichText'
import { useSession } from '../../hooks/useSession'
import {
  getEmployeeArticle,
  getEmployeeLearningResourcesSettings,
  listEmployeeArticleTopics,
  listEmployeeArticles,
  listEmployeeFlashCards,
} from '../../services/employee'
import type { FlashCard } from '../../types'

const stripMarkdown = (value: string) =>
  value
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*+/g, '')
    .trim()

const resolveCorrectAnswerLabels = (flashCard: FlashCard) => {
  const selectedIds = Array.isArray(flashCard.correctAnswer)
    ? flashCard.correctAnswer
    : [flashCard.correctAnswer]

  return selectedIds
    .map(
      (answerId) =>
        flashCard.options.find((option) => option.id === answerId)?.label || answerId,
    )
    .filter(Boolean)
}

const ArticlesTab = ({ companyId }: { companyId: string }) => {
  const [topicFilter, setTopicFilter] = useState('')
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)

  const { data: topics = [] } = useQuery({
    queryKey: ['articleTopics', companyId],
    queryFn: async () => {
      const response = await listEmployeeArticleTopics(companyId)
      if (!response.success || !response.data)
        throw new Error(response.error || 'Failed to load')
      return response.data
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['employee-learning-resources-articles', companyId, topicFilter],
    queryFn: async () => {
      const response = await listEmployeeArticles({
        companyId,
        topicId: topicFilter || undefined,
      })
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load articles')
      }
      return response.data
    },
    enabled: !!companyId,
  })

  const { data: selectedArticle, isLoading: isArticleLoading } = useQuery({
    queryKey: ['employee-learning-resource-article', selectedArticleId],
    queryFn: async () => {
      const response = await getEmployeeArticle(selectedArticleId!)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load article')
      }
      return response.data
    },
    enabled: !!selectedArticleId,
  })

  const topicMap = Object.fromEntries(topics.map((topic) => [topic.id, topic.name]))

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin />
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Selection
          value={topicFilter}
          onChange={(value) => setTopicFilter(value)}
          options={[
            { value: '', label: 'All topics' },
            ...topics.map((topic) => ({ value: topic.id, label: topic.name })),
          ]}
          className="w-48"
        />
        <Typography.Text type="secondary">
          {articles.length} article{articles.length === 1 ? '' : 's'}
        </Typography.Text>
      </div>

      {articles.length === 0 ? (
        <Typography.Text type="secondary">
          No articles available right now.
        </Typography.Text>
      ) : (
        <div className="flex flex-col gap-4">
          {articles.map((article) => (
            <Card
              key={article.id}
              hoverable
              onClick={() => setSelectedArticleId(article.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setSelectedArticleId(article.id)
                }
              }}
              aria-label={`Open article ${stripMarkdown(article.title)}`}
            >
              <div className="flex flex-col gap-3">
                <Typography.Title level={5} className="mb-0">
                  <RichText content={article.title} />
                </Typography.Title>
                <Typography.Paragraph type="secondary" className="mb-0">
                  {stripMarkdown(article.description).slice(0, 180)}
                  {stripMarkdown(article.description).length > 180 ? '...' : ''}
                </Typography.Paragraph>
                <div className="flex flex-wrap gap-1">
                  {article.topicIds?.length ? (
                    article.topicIds
                      .map((topicId) => topicMap[topicId])
                      .filter(Boolean)
                      .map((topicName) => <Tag key={topicName}>{topicName}</Tag>)
                  ) : (
                    <Tag color="default">No topics</Tag>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!selectedArticleId}
        onCancel={() => setSelectedArticleId(null)}
        footer={null}
        width={800}
      >
        {isArticleLoading ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : selectedArticle ? (
          <div className="flex flex-col gap-4">
            <Typography.Title level={4} className="mb-0">
              <RichText content={selectedArticle.title} />
            </Typography.Title>
            <Typography.Paragraph className="mb-0 whitespace-pre-wrap">
              <RichText content={selectedArticle.description} />
            </Typography.Paragraph>
            <div className="flex flex-wrap gap-1 justify-end">
              {selectedArticle.topicIds?.length &&
                selectedArticle.topicIds
                  .map((topicId) => topicMap[topicId])
                  .filter(Boolean)
                  .map((topicName) => <Tag key={topicName}>{topicName}</Tag>)}
            </div>
          </div>
        ) : (
          <Typography.Text type="secondary">Unable to load this article.</Typography.Text>
        )}
      </Modal>
    </div>
  )
}

type SwipePhase = 'idle' | 'swipe-out' | 'swipe-in'
type SwipeDirection = 'left' | 'right'

const SWIPE_DURATION_MS = 250

const FlashCardsTab = ({ companyId }: { companyId: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)

  const [swipePhase, setSwipePhase] = useState<SwipePhase>('idle')
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>('left')
  const swipeLock = useRef(false)
  const [isLocked, setIsLocked] = useState(false)

  const { data: flashCards = [], isLoading } = useQuery({
    queryKey: ['employee-learning-resources-flash-cards', companyId],
    queryFn: async () => {
      const response = await listEmployeeFlashCards(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load flash cards')
      }
      return response.data
    },
    enabled: !!companyId,
  })

  const currentFlashCard = flashCards[currentIndex]
  const currentAnswers = useMemo(
    () => (currentFlashCard ? resolveCorrectAnswerLabels(currentFlashCard) : []),
    [currentFlashCard],
  )

  const restartSession = () => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setSessionEnded(false)
    setSwipePhase('idle')
    swipeLock.current = false
    setIsLocked(false)
  }

  const finishSession = () => {
    setSessionEnded(true)
    setIsFlipped(false)
  }

  const navigateCard = useCallback((direction: SwipeDirection, nextIndex: number) => {
    if (swipeLock.current) return
    swipeLock.current = true
    setIsLocked(true)
    setSwipeDirection(direction)
    setSwipePhase('swipe-out')

    setTimeout(() => {
      setIsFlipped(false)
      setCurrentIndex(nextIndex)
      setSwipeDirection(direction === 'left' ? 'right' : 'left')
      setSwipePhase('swipe-in')

      setTimeout(() => {
        setSwipePhase('idle')
        swipeLock.current = false
        setIsLocked(false)
      }, SWIPE_DURATION_MS)
    }, SWIPE_DURATION_MS)
  }, [])

  const goToNext = useCallback(() => {
    if (swipeLock.current) return
    if (currentIndex >= flashCards.length - 1) {
      finishSession()
      return
    }
    navigateCard('left', currentIndex + 1)
  }, [currentIndex, flashCards.length, navigateCard])

  const goToPrevious = useCallback(() => {
    if (swipeLock.current) return
    if (currentIndex === 0) return
    navigateCard('right', currentIndex - 1)
  }, [currentIndex, navigateCard])

  const swipeTransform = (() => {
    if (swipePhase === 'idle') return 'translateX(0)'
    const sign = swipeDirection === 'left' ? '-' : ''
    if (swipePhase === 'swipe-out') return `translateX(${sign}120%)`
    return `translateX(${sign}120%)`
  })()

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin />
      </div>
    )
  }

  if (flashCards.length === 0) {
    return (
      <Typography.Text type="secondary">
        No flash cards available right now.
      </Typography.Text>
    )
  }

  if (sessionEnded) {
    return (
      <Card className="mx-auto w-full max-w-3xl">
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <Typography.Title level={4} className="mb-0">
            You&apos;ve reviewed all cards
          </Typography.Title>
          <Typography.Text type="secondary">
            Click restart to go through the flash cards again.
          </Typography.Text>
          <Button onClick={restartSession}>Restart</Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <Typography.Text type="secondary">
          Card {currentIndex + 1} of {flashCards.length}
        </Typography.Text>
      </div>
      <div className="mx-auto w-full max-w-3xl overflow-hidden">
        <div
          style={{
            transform: swipeTransform,
            opacity: swipePhase === 'idle' ? 1 : 0,
            transition:
              swipePhase === 'idle'
                ? `transform ${SWIPE_DURATION_MS}ms ease-out, opacity ${SWIPE_DURATION_MS}ms ease-out`
                : swipePhase === 'swipe-out'
                  ? `transform ${SWIPE_DURATION_MS}ms ease-in, opacity ${SWIPE_DURATION_MS * 0.6}ms ease-in`
                  : 'none',
          }}
        >
          <div style={{ perspective: '1200px' }}>
            <div
              role="button"
              tabIndex={0}
              aria-label="Flip flash card"
              className="relative h-[320px] w-full cursor-pointer sm:h-[460px]"
              style={{
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transformStyle: 'preserve-3d',
                transition: swipePhase === 'idle' ? 'transform 500ms' : 'none',
              }}
              onClick={() => {
                if (swipeLock.current) return
                setIsFlipped((prev) => !prev)
              }}
              onKeyDown={(event) => {
                if (swipeLock.current) return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setIsFlipped((prev) => !prev)
                }
                if (event.key === 'ArrowRight') {
                  event.preventDefault()
                  goToNext()
                }
                if (event.key === 'ArrowLeft') {
                  event.preventDefault()
                  goToPrevious()
                }
              }}
            >
              <Card
                className="absolute inset-0 h-full w-full"
                styles={{ body: { height: '100%', overflowY: 'auto' } }}
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <Typography.Text type="secondary">Question</Typography.Text>
                  {currentFlashCard?.imageId ? (
                    <QuestionImage
                      key={currentFlashCard.imageId}
                      imageId={currentFlashCard.imageId}
                    />
                  ) : null}
                  <Typography.Title level={3} className="mb-0">
                    <RichText content={currentFlashCard?.title} />
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    <span className="hidden pointer-coarse:inline">Tap</span>
                    <span className="pointer-coarse:hidden">Click</span> the card to
                    reveal the answer.
                  </Typography.Text>
                </div>
              </Card>

              <Card
                className="absolute inset-0 h-full w-full"
                styles={{ body: { height: '100%', overflowY: 'auto' } }}
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <Typography.Text type="secondary">Correct answer</Typography.Text>
                  <div className="flex flex-col gap-2">
                    {currentAnswers.map((answer) => (
                      <Tag key={answer} className="px-3 py-1 text-base">
                        {answer}
                      </Tag>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={goToPrevious} disabled={currentIndex === 0 || isLocked}>
          Previous
        </Button>
        <Button onClick={restartSession}>Restart</Button>
        <Button type="primary" onClick={goToNext} disabled={isLocked}>
          {currentIndex === flashCards.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </div>
    </div>
  )
}

const EmployeeLearningResourcesPage = () => {
  const { userProfile, profileError } = useSession()
  const companyId = userProfile?.companyId

  const { data: settings, isLoading } = useQuery({
    queryKey: ['employee-learning-resources-settings', companyId],
    queryFn: async () => {
      const response = await getEmployeeLearningResourcesSettings(companyId!)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load settings')
      }
      return response.data
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
  })

  const heading = <StandardPageHeading title="Learning Resources" icon={<BookOpen />} />

  if (profileError) {
    return (
      <EmployeeLayout pageHeading={heading}>
        <Alert
          type="error"
          message="Account not found"
          description={profileError}
          showIcon
        />
      </EmployeeLayout>
    )
  }

  return (
    <EmployeeLayout pageHeading={heading}>
      <div className="flex w-full flex-col gap-6">
        {!companyId || isLoading ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : !settings?.articlesEnabled && !settings?.flashCardsEnabled ? (
          <Typography.Text type="secondary">
            Learning resources are not enabled for your company yet.
          </Typography.Text>
        ) : (
          <Tabs
            defaultActiveKey={settings.articlesEnabled ? 'articles' : 'flash-cards'}
            items={[
              ...(settings.articlesEnabled
                ? [
                    {
                      key: 'articles',
                      label: 'Articles',
                      children: <ArticlesTab companyId={companyId} />,
                    },
                  ]
                : []),
              ...(settings.flashCardsEnabled
                ? [
                    {
                      key: 'flash-cards',
                      label: 'Flash Cards',
                      children: <FlashCardsTab companyId={companyId} />,
                    },
                  ]
                : []),
            ]}
          />
        )}
      </div>
    </EmployeeLayout>
  )
}

export default EmployeeLearningResourcesPage
