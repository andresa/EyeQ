import { Card, Progress, Timeline, Typography } from 'antd'
import {
  CalendarPlus,
  FolderOpen,
  CheckCircle,
  Timer,
  ClipboardCheck,
  Hourglass,
} from 'lucide-react'
import type { TimelineItemProps } from 'antd'
import type { TestInstance } from '../../types'
import StatusBadge from '../atoms/StatusBadge'
import ScoreTag from '../atoms/ScoreTag'

export interface LiveScore {
  total: number
  correct: number
  incorrect: number
  marked: number
  percent: number
}

interface SubmissionHistoryColumnProps {
  instance: TestInstance
  employeeName: React.ReactNode
  liveScore?: LiveScore
  isMarking?: boolean
}

const ICON_SIZE = 18

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return (
    date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) +
    ' at ' +
    date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })
  )
}

function formatDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  if (ms < 0) return ''
  const totalMinutes = Math.round(ms / 60_000)
  if (totalMinutes === 0) return '<1m'
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  return parts.join(' ')
}

const tailwindColorMap: Record<string, string> = {
  marked: 'text-purple-500',
  'timed-out': 'text-orange-600',
  completed: 'text-green-500',
  opened: 'text-cyan-500',
  expired: 'text-red-500',
  assigned: 'text-blue-500',
}

interface SortableEvent {
  timestamp: string
  item: TimelineItemProps
}

function buildTimelineItems(instance: TestInstance): TimelineItemProps[] {
  const events: SortableEvent[] = []

  if (instance.markedAt) {
    events.push({
      timestamp: instance.markedAt,
      item: {
        dot: (
          <div className={tailwindColorMap.marked}>
            <ClipboardCheck size={ICON_SIZE} />
          </div>
        ),
        children: (
          <div className="flex flex-col gap-0.5">
            <Typography.Text strong>Marked</Typography.Text>
            <Typography.Text type="secondary" className="text-xs">
              {formatDateTime(instance.markedAt)}
            </Typography.Text>
          </div>
        ),
      },
    })
  }

  if (instance.timedOutAt) {
    events.push({
      timestamp: instance.timedOutAt,
      item: {
        dot: (
          <div className={tailwindColorMap['timed-out']}>
            <Timer size={ICON_SIZE} />
          </div>
        ),
        children: (
          <div className="flex flex-col gap-0.5">
            <Typography.Text strong>Timed Out</Typography.Text>
            <Typography.Text type="secondary" className="text-xs">
              {formatDateTime(instance.timedOutAt)}
            </Typography.Text>
            {instance.openedAt && (
              <Typography.Text type="secondary" className="text-xs">
                Duration: {formatDuration(instance.openedAt, instance.timedOutAt)}
              </Typography.Text>
            )}
          </div>
        ),
      },
    })
  }

  if (instance.completedAt) {
    events.push({
      timestamp: instance.completedAt,
      item: {
        dot: (
          <div className={tailwindColorMap.completed}>
            <CheckCircle size={ICON_SIZE} />
          </div>
        ),
        children: (
          <div className="flex flex-col gap-0.5">
            <Typography.Text strong>Completed</Typography.Text>
            <Typography.Text type="secondary" className="text-xs">
              {formatDateTime(instance.completedAt)}
            </Typography.Text>
            {instance.openedAt && (
              <Typography.Text type="secondary" className="text-xs">
                Duration: {formatDuration(instance.openedAt, instance.completedAt)}
              </Typography.Text>
            )}
          </div>
        ),
      },
    })
  }

  if (instance.openedAt) {
    events.push({
      timestamp: instance.openedAt,
      item: {
        dot: (
          <div className={tailwindColorMap.opened}>
            <FolderOpen size={ICON_SIZE} />
          </div>
        ),
        children: (
          <div className="flex flex-col gap-0.5">
            <Typography.Text strong>Opened</Typography.Text>
            <Typography.Text type="secondary" className="text-xs">
              {formatDateTime(instance.openedAt)}
            </Typography.Text>
          </div>
        ),
      },
    })
  }

  if (instance.status === 'expired' && instance.expiresAt) {
    events.push({
      timestamp: instance.expiresAt,
      item: {
        dot: (
          <div className={tailwindColorMap.expired}>
            <Hourglass size={ICON_SIZE} />
          </div>
        ),
        children: (
          <div className="flex flex-col gap-0.5">
            <Typography.Text strong>Expired</Typography.Text>
            <Typography.Text type="secondary" className="text-xs">
              {formatDateTime(instance.expiresAt)}
            </Typography.Text>
          </div>
        ),
      },
    })
  }

  events.push({
    timestamp: instance.assignedAt,
    item: {
      dot: (
        <div className={tailwindColorMap.assigned}>
          <CalendarPlus size={ICON_SIZE} />
        </div>
      ),
      children: (
        <div className="flex flex-col gap-0.5">
          <Typography.Text strong>Assigned</Typography.Text>
          <Typography.Text type="secondary" className="text-xs">
            {formatDateTime(instance.assignedAt)}
          </Typography.Text>
        </div>
      ),
    },
  })

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return events.map((e) => e.item)
}

const SubmissionHistoryColumn = ({
  instance,
  employeeName,
  liveScore,
  isMarking,
}: SubmissionHistoryColumnProps) => {
  const items = buildTimelineItems(instance)

  return (
    <div className="flex flex-col gap-0 h-full">
      <Card size="small" className="shrink-0">
        <div className="flex flex-col gap-1">
          <Typography.Text strong>{employeeName}</Typography.Text>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Typography.Text type="secondary">Status:</Typography.Text>
              <StatusBadge status={instance.status} />
            </div>
            {instance.status === 'marked' && instance.score != null && (
              <div className="flex items-center gap-1">
                <Typography.Text type="secondary">Score:</Typography.Text>
                <ScoreTag instance={instance} />
              </div>
            )}
          </div>
          {instance.expiresAt &&
            ['assigned', 'opened', 'in-progress'].includes(instance.status) && (
              <Typography.Text type="secondary" className="text-xs">
                Expires: {formatDateTime(instance.expiresAt)}
              </Typography.Text>
            )}
          {isMarking && liveScore && (
            <div className="flex flex-col items-center gap-1 pt-3 border-t border-gray-100 mt-2">
              <Progress
                type="circle"
                size={80}
                percent={liveScore.percent}
                strokeColor={
                  liveScore.percent >= 70
                    ? '#52c41a'
                    : liveScore.percent >= 50
                      ? '#faad14'
                      : '#ff4d4f'
                }
                format={() => `${liveScore.percent}%`}
              />
              <div className="flex gap-3 text-xs">
                <Typography.Text type="success">
                  {liveScore.correct} correct
                </Typography.Text>
                <Typography.Text type="danger">
                  {liveScore.incorrect} incorrect
                </Typography.Text>
              </div>
              <Typography.Text type="secondary" className="text-xs">
                {liveScore.marked}/{liveScore.total} marked
              </Typography.Text>
            </div>
          )}
        </div>
      </Card>

      <div className="flex-1 min-h-0 overflow-y-auto pt-4 pl-1">
        <Timeline items={items} />
      </div>
    </div>
  )
}

export default SubmissionHistoryColumn
