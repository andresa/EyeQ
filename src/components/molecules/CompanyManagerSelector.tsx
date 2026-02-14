import { Card, Select, Space } from 'antd'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listCompaniesShared, listManagersShared } from '../../services/shared'
import type { Company, Manager } from '../../types'
import { useSession } from '../../hooks/useSession'

interface CompanyManagerSelectorProps {
  onSelectionChange?: (companyId: string | null, managerId: string | null) => void
}

const CompanyManagerSelector = ({ onSelectionChange }: CompanyManagerSelectorProps) => {
  const { userProfile } = useSession()
  const [companyId, setCompanyId] = useState(userProfile?.companyId || '')
  const [managerId, setManagerId] = useState('')

  const { data: companies } = useQuery({
    queryKey: ['shared', 'companies'],
    queryFn: async () => {
      const response = await listCompaniesShared()
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load companies')
      }
      return response.data
    },
  })

  const { data: managers } = useQuery({
    queryKey: ['shared', 'managers', companyId],
    queryFn: async () => {
      if (!companyId) return [] as Manager[]
      const response = await listManagersShared(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load managers')
      }
      return response.data
    },
  })

  const handleCompanyChange = (value: string) => {
    setCompanyId(value)
    setManagerId('')
    onSelectionChange?.(value || null, null)
  }

  const handleManagerChange = (value: string) => {
    setManagerId(value)
    onSelectionChange?.(companyId || null, value || null)
  }

  return (
    <Card>
      <Space orientation="vertical" className="w-full">
        <Select
          placeholder="Select company"
          value={companyId || undefined}
          onChange={handleCompanyChange}
          allowClear
          options={(companies || []).map((company: Company) => ({
            label: company.name,
            value: company.id,
          }))}
          aria-label="Select company"
          className="w-full"
        />
        <Select
          placeholder="Select manager"
          value={managerId || undefined}
          onChange={handleManagerChange}
          allowClear
          disabled={!companyId}
          options={(managers || []).map((manager: Manager) => ({
            label: `${manager.firstName} ${manager.lastName}`,
            value: manager.id,
          }))}
          aria-label="Select manager"
          className="w-full"
        />
      </Space>
    </Card>
  )
}

export default CompanyManagerSelector
