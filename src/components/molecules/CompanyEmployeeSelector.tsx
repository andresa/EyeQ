import { Card, Select } from 'antd'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listCompaniesShared, listEmployeesShared } from '../../services/shared'
import type { Company, Employee } from '../../types'
import { useSession } from '../../hooks/useSession'

interface CompanyEmployeeSelectorProps {
  onSelectionChange?: (companyId: string | null, employeeId: string | null) => void
}

const CompanyEmployeeSelector = ({ onSelectionChange }: CompanyEmployeeSelectorProps) => {
  const { userProfile } = useSession()
  const [companyId, setCompanyId] = useState(userProfile?.companyId || '')
  const [employeeId, setEmployeeId] = useState('')

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

  const handleCompanyChange = (value: string) => {
    setCompanyId(value)
    setEmployeeId('')
    onSelectionChange?.(value || null, null)
  }

  const handleEmployeeChange = (value: string) => {
    setEmployeeId(value)
    onSelectionChange?.(companyId || null, value || null)
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 w-full">
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
          placeholder="Select employee"
          value={employeeId || undefined}
          onChange={handleEmployeeChange}
          allowClear
          disabled={!companyId}
          options={(employees || []).map((employee: Employee) => ({
            label: `${employee.firstName} ${employee.lastName}`,
            value: employee.id,
          }))}
          aria-label="Select employee"
          className="w-full"
        />
      </div>
    </Card>
  )
}

export default CompanyEmployeeSelector
