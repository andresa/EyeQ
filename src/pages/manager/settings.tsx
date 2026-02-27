import ManagerLayout from '../../layouts/ManagerLayout'
import StandardPageHeading from '../../components/molecules/StandardPageHeading'
import { Typography } from 'antd'
import { useSession } from '../../hooks/useSession'
import CategoriesSection from '../../components/organisms/CategoriesSection'
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
