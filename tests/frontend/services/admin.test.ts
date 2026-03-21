import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/services/api', () => ({
  apiRequest: vi.fn(),
}))

import { apiRequest } from '../../../src/services/api'
import {
  createCompany,
  updateCompany,
  listCompanies,
  deleteCompany,
  createManager,
  updateManager,
  listManagers,
  deleteManager,
  sendManagerInvitation,
  createEmployee,
  updateEmployee,
  listEmployees,
} from '../../../src/services/admin'

const mockApiRequest = vi.mocked(apiRequest)

describe('services/admin', () => {
  beforeEach(() => vi.clearAllMocks())

  it('createCompany calls POST /management/companies', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await createCompany({ name: 'Corp' })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/management/companies',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updateCompany calls PUT /management/companies/:id', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await updateCompany('c1', { name: 'Updated' })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/management/companies/c1',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('listCompanies calls GET /management/companies', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listCompanies()
    expect(mockApiRequest).toHaveBeenCalledWith('/management/companies')
  })

  it('listCompanies includes pagination params when provided', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listCompanies({ limit: 10, cursor: 'cursor_1' })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/management/companies?limit=10&cursor=cursor_1',
    )
  })

  it('deleteCompany calls DELETE /management/companies/:id', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await deleteCompany('c1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/management/companies/c1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('createManager calls POST /management/managers', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await createManager({
      companyId: 'c1',
      firstName: 'J',
      lastName: 'D',
      email: 'j@t.com',
    })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/management/managers',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updateManager calls PUT with companyId query', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await updateManager('m1', 'c1', { firstName: 'U' })
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/management/managers/m1?companyId=c1'),
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('listManagers calls GET with companyId', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listManagers('c1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/management/managers?companyId=c1'),
    )
  })

  it('listManagers includes pagination params when provided', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listManagers({ companyId: 'c1', limit: 10, cursor: 'cursor_2' })
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining(
        '/management/managers?companyId=c1&limit=10&cursor=cursor_2',
      ),
    )
  })

  it('deleteManager calls DELETE', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await deleteManager('m1', 'c1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/management/managers/m1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('sendManagerInvitation calls POST /management/managers/:id/invite', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await sendManagerInvitation('m1', { companyId: 'c1', invitedEmail: 'j@t.com' })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/management/managers/m1/invite',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('createEmployee calls POST /management/employees', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await createEmployee({
      companyId: 'c1',
      firstName: 'J',
      lastName: 'S',
      email: 'j@t.com',
    })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/management/employees',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updateEmployee calls PUT with companyId', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await updateEmployee('e1', 'c1', { firstName: 'U' })
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/management/employees/e1?companyId=c1'),
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('listEmployees calls GET with companyId', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listEmployees('c1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/management/employees?companyId=c1'),
    )
  })

  it('listEmployees calls GET without companyId', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listEmployees()
    expect(mockApiRequest).toHaveBeenCalledWith('/management/employees')
  })

  it('listEmployees includes pagination params when provided', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listEmployees({ companyId: 'c1', limit: 10, cursor: 'cursor_3' })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/management/employees?companyId=c1&limit=10&cursor=cursor_3',
    )
  })
})
