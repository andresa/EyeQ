import ManagerLayout from '../../layouts/ManagerLayout'
import { Typography } from 'antd'
import { useSession } from '../../hooks/useSession'
import CategoriesSection from '../../components/organisms/CategoriesSection'

const ManagerSettingsPage = () => {
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId

  return (
    <ManagerLayout>
      <div className="flex flex-col gap-6 w-full">
        <Typography.Title level={3} className="m-0">
          Settings
        </Typography.Title>
        {companyId ? (
          <CategoriesSection companyId={companyId} />
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
