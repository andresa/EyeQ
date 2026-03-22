import ManagerLayout from '../../layouts/ManagerLayout'
import StandardPageHeading from '../../components/molecules/StandardPageHeading'
import { Tabs, Typography } from 'antd'
import { useSession } from '../../hooks/useSession'
import ArticleTopicsSection from '../../components/organisms/ArticleTopicsSection'
import CategoriesSection from '../../components/organisms/CategoriesSection'
import LeaderboardSettingsSection from '../../components/organisms/LeaderboardSettingsSection'
import LearningResourcesSettingsSection from '../../components/organisms/LearningResourcesSettingsSection'
import { Settings } from 'lucide-react'

const ManagerSettingsPage = () => {
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId

  return (
    <ManagerLayout
      pageHeading={<StandardPageHeading title="Settings" icon={<Settings />} />}
    >
      <div className="flex flex-col gap-6 w-full">
        {companyId ? (
          <Tabs
            defaultActiveKey="categories"
            items={[
              {
                key: 'categories',
                label: 'Question Categories',
                children: <CategoriesSection companyId={companyId} />,
              },
              {
                key: 'article-topics',
                label: 'Article Topics',
                children: <ArticleTopicsSection companyId={companyId} />,
              },
              {
                key: 'learning-resources',
                label: 'Learning Resources',
                children: <LearningResourcesSettingsSection companyId={companyId} />,
              },
              {
                key: 'leaderboard',
                label: 'Leaderboard',
                children: <LeaderboardSettingsSection companyId={companyId} />,
              },
            ]}
          />
        ) : (
          <Typography.Text type="secondary">
            You must be associated with a company to manage settings.
          </Typography.Text>
        )}
      </div>
    </ManagerLayout>
  )
}

export default ManagerSettingsPage
