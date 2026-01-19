import { Card, Select, Space } from 'antd'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listCompaniesShared, listEmployersShared } from '../../services/shared'
import type { Company, Employer } from '../../types'
import { useSession } from '../../hooks/useSession'

const CompanyEmployerSelector = () => {
  const { session, setSession } = useSession()
  const [companyId, setCompanyId] = useState(session?.companyId || '')
  const [employerId, setEmployerId] = useState(session?.employerId || '')

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

  useEffect(() => {
    if (!session) return
    const nextCompanyId = companyId || undefined
    const nextEmployerId = employerId || undefined
    if (session.companyId === nextCompanyId && session.employerId === nextEmployerId) {
      return
    }
    setSession({
      ...session,
      companyId: nextCompanyId,
      employerId: nextEmployerId,
    })
  }, [companyId, employerId, session, setSession])

  const handleCompanyChange = (value: string) => {
    setCompanyId(value)
    if (!value) {
      setEmployerId('')
    }
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
        />
        <Select
          placeholder="Select employer"
          value={employerId || undefined}
          onChange={(value) => setEmployerId(value)}
          allowClear
          disabled={!companyId}
          options={(employers || []).map((employer: Employer) => ({
            label: `${employer.firstName} ${employer.lastName}`,
            value: employer.id,
          }))}
          aria-label="Select employer"
        />
      </Space>
    </Card>
  )
}

export default CompanyEmployerSelector
