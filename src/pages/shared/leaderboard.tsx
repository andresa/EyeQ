import { Spin, Typography } from 'antd'
import { Trophy } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '../../hooks/useSession'
import { fetchLeaderboardSettings } from '../../services/shared'
import ManagerLayout from '../../layouts/ManagerLayout'
import EmployeeLayout from '../../layouts/EmployeeLayout'
import StandardPageHeading from '../../components/molecules/StandardPageHeading'
import LeaderboardTable from '../../components/organisms/LeaderboardTable'

const LeaderboardPage = () => {
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId
  const role = userProfile?.role

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard-settings', companyId],
    queryFn: async () => {
      const response = await fetchLeaderboardSettings(companyId!)
      if (!response.success || !response.data) throw new Error(response.error)
      return response.data
    },
    enabled: !!companyId,
  })

  const boards = data?.boards ?? []

  const content = isLoading ? (
    <div className="flex justify-center py-12">
      <Spin size="large" />
    </div>
  ) : boards.length === 0 ? (
    <Typography.Text type="secondary">No leaderboards configured.</Typography.Text>
  ) : (
    <div
      className={`grid gap-6 w-full ${boards.length === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}
    >
      {boards.map((board, index) => (
        <LeaderboardTable
          key={index}
          companyId={companyId!}
          boardIndex={index}
          board={board}
        />
      ))}
    </div>
  )

  const heading = <StandardPageHeading title="Leaderboard" icon={<Trophy />} />

  if (role === 'employee') {
    return (
      <EmployeeLayout pageHeading={heading}>
        <div className="flex flex-col gap-6 w-full">{content}</div>
      </EmployeeLayout>
    )
  }

  return (
    <ManagerLayout pageHeading={heading}>
      <div className="flex flex-col gap-6 w-full">{content}</div>
    </ManagerLayout>
  )
}

export default LeaderboardPage
