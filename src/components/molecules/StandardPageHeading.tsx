import { Button, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface StandardPageHeadingProps {
  title: ReactNode
  icon?: ReactNode
  backTo?: string
  actions?: ReactNode
}

const StandardPageHeading = ({
  title,
  icon,
  backTo,
  actions,
}: StandardPageHeadingProps) => {
  const navigate = useNavigate()
  const hasBack = Boolean(backTo)
  const leftGap = hasBack ? 'gap-4' : 'gap-2'

  const titleContent =
    typeof title === 'string' || typeof title === 'number' ? (
      <Typography.Title level={4} className="truncate">
        {title}
      </Typography.Title>
    ) : (
      title
    )

  return (
    <div className="h-[60px] flex-shrink-0 flex items-center justify-between px-6 bg-white border-b border-neutral-200">
      <div className={`flex min-w-0 flex-1 items-center overflow-hidden ${leftGap}`}>
        {hasBack && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(backTo!)}
            aria-label="Back"
          />
        )}
        {icon}
        <div
          className="min-w-0 flex-1 overflow-hidden"
          title={typeof title === 'string' ? title : undefined}
        >
          {titleContent}
        </div>
      </div>
      {actions ?? null}
    </div>
  )
}

export default StandardPageHeading
