import { Card, Select, Space } from 'antd'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listCompaniesShared, listEmployeesShared } from '../../services/shared'
import type { Company, Employee } from '../../types'
import { useSession } from '../../hooks/useSession'

const CompanyEmployeeSelector = () => {
  const { session, setSession } = useSession()
  const [companyId, setCompanyId] = useState(session?.companyId || '')
  const [employeeId, setEmployeeId] = useState(session?.employeeId || '')

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

  const { data: employees } = useQuery({
    queryKey: ['shared', 'employees', companyId],
    queryFn: async () => {
      if (!companyId) return [] as Employee[]
      const response = await listEmployeesShared(companyId)
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
    if (session.companyId === nextCompanyId && session.employeeId === nextEmployeeId) {
      return
    }
    setSession({
      ...session,
      companyId: nextCompanyId,
      employeeId: nextEmployeeId,
    })
  }, [companyId, employeeId, session, setSession])

  const handleCompanyChange = (value: string) => {
    setCompanyId(value)
    if (!value) {
      setEmployeeId('')
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
