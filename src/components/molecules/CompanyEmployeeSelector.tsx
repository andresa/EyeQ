import { Card, Select, Space } from 'antd'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listCompanies } from '../../services/admin'
import { listEmployees } from '../../services/employer'
import type { Company, Employee } from '../../types'
import { useSession } from '../../hooks/useSession'

const CompanyEmployeeSelector = () => {
  const { session, setSession } = useSession()
  const [companyId, setCompanyId] = useState(session?.companyId || '')
  const [employeeId, setEmployeeId] = useState(session?.employeeId || '')

  const { data: companies } = useQuery({
    queryKey: ['admin', 'companies'],
    queryFn: async () => {
      const response = await listCompanies()
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load companies')
      }
      return response.data
    },
  })

  const { data: employees } = useQuery({
    queryKey: ['employer', 'employees', companyId],
    queryFn: async () => {
      if (!companyId) return [] as Employee[]
      const response = await listEmployees(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load employees')
      }
      return response.data
    },
  })

  useEffect(() => {
    if (!session) return
    const nextCompanyId = companyId || undefined
    const nextEmployeeId = employeeId || undefined
    if (
      session.companyId === nextCompanyId &&
      session.employeeId === nextEmployeeId
    ) {
      return
    }
    setSession({
      ...session,
      companyId: nextCompanyId,
      employeeId: nextEmployeeId,
    })
  }, [companyId, employeeId, session, setSession])

  useEffect(() => {
    if (companyId) return
    setEmployeeId('')
  }, [companyId])

  return (
    <Card>
      <Space orientation="vertical" className="w-full">
        <Select
          placeholder="Select company"
          value={companyId || undefined}
          onChange={(value) => setCompanyId(value)}
          allowClear
          options={(companies || []).map((company: Company) => ({
            label: company.name,
            value: company.id,
          }))}
          aria-label="Select company"
        />
        <Select
          placeholder="Select employee"
          value={employeeId || undefined}
          onChange={(value) => setEmployeeId(value)}
          allowClear
          disabled={!companyId}
          options={(employees || []).map((employee: Employee) => ({
            label: `${employee.firstName} ${employee.lastName}`,
            value: employee.id,
          }))}
          aria-label="Select employee"
        />
      </Space>
    </Card>
  )
}

export default CompanyEmployeeSelector
