import { Card, Select, Space } from 'antd'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listCompaniesShared, listEmployersShared } from '../../services/shared'
import type { Company, Employer } from '../../types'
import { useSession } from '../../hooks/useSession'

interface CompanyEmployerSelectorProps {
  onSelectionChange?: (companyId: string | null, employerId: string | null) => void
}

const CompanyEmployerSelector = ({ onSelectionChange }: CompanyEmployerSelectorProps) => {
  const { userProfile } = useSession()
  const [companyId, setCompanyId] = useState(userProfile?.companyId || '')
  const [employerId, setEmployerId] = useState('')

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

  const { data: employers } = useQuery({
    queryKey: ['shared', 'employers', companyId],
    queryFn: async () => {
      if (!companyId) return [] as Employer[]
      const response = await listEmployersShared(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load employers')
      }
      return response.data
    },
  })

  const handleCompanyChange = (value: string) => {
    setCompanyId(value)
    setEmployerId('')
    onSelectionChange?.(value || null, null)
  }

  const handleEmployerChange = (value: string) => {
    setEmployerId(value)
    onSelectionChange?.(companyId || null, value || null)
  }

  return (
    <Card>
      <Space direction="vertical" className="w-full">
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
          placeholder="Select employer"
          value={employerId || undefined}
          onChange={handleEmployerChange}
          allowClear
          disabled={!companyId}
          options={(employers || []).map((employer: Employer) => ({
            label: `${employer.firstName} ${employer.lastName}`,
            value: employer.id,
          }))}
          aria-label="Select employer"
          className="w-full"
        />
      </Space>
    </Card>
  )
}

export default CompanyEmployerSelector
