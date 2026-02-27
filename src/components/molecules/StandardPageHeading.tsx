import { Button, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeading from '../atoms/PageHeading'

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
      <Typography.Title level={4}>{title}</Typography.Title>
    ) : (
      title
    )

  return (
    <PageHeading>
      <div className={`flex items-center ${leftGap}`}>
        {hasBack && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(backTo!)}
            aria-label="Back"
          />
        )}
        {icon}
        {titleContent}
      </div>
      {actions ?? null}
    </PageHeading>
  )
}

export default StandardPageHeading
