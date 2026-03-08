import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/services/api', () => ({
  apiRequest: vi.fn(),
}))

import { apiRequest } from '../../../src/services/api'
import {
  sendInvitation,
  createEmployees,
  updateEmployee,
  listEmployees,
  deleteEmployee,
  createTestTemplate,
  updateTestTemplate,
  deleteTestTemplate,
  duplicateTestTemplate,
  listTests,
  assignTest,
  listTestInstances,
  markTestInstance,
  listQuestionLibrary,
  createQuestionLibraryItems,
  updateQuestionLibraryItem,
  deleteQuestionLibraryItem,
  listQuestionCategories,
  createQuestionCategory,
  updateQuestionCategory,
  deleteQuestionCategory,
  getImageUploadUrl,
} from '../../../src/services/manager'

const mockApiRequest = vi.mocked(apiRequest)

describe('services/manager', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sendInvitation calls POST /manager/employees/:id/invite', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await sendInvitation('e1', { companyId: 'c1', invitedEmail: 'j@t.com' })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/manager/employees/e1/invite',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('createEmployees calls POST /manager/employees', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await createEmployees({
      companyId: 'c1',
      employees: [{ firstName: 'J', lastName: 'S', email: 'j@t.com' }],
    })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/manager/employees',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updateEmployee calls PUT with companyId', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await updateEmployee('e1', 'c1', { firstName: 'U' })
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/manager/employees/e1'),
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('listEmployees calls GET with companyId', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listEmployees('c1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/manager/employees?companyId=c1'),
    )
  })

  it('deleteEmployee calls DELETE', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await deleteEmployee('e1', 'c1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/manager/employees/e1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('createTestTemplate calls POST /manager/tests', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await createTestTemplate({
      companyId: 'c1',
      managerId: 'm1',
      name: 'Test',
      sections: [],
    })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/manager/tests',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updateTestTemplate calls PUT /manager/tests/:id', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await updateTestTemplate('t1', { name: 'Updated' })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/manager/tests/t1',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('deleteTestTemplate calls DELETE /manager/tests/:id', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await deleteTestTemplate('t1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/manager/tests/t1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('duplicateTestTemplate calls POST /manager/tests/:id/duplicate', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await duplicateTestTemplate('t1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/manager/tests/t1/duplicate',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('listTests calls GET with companyId', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listTests('c1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/manager/tests?companyId=c1'),
    )
  })

  it('assignTest calls POST /manager/tests/:id/assign', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await assignTest('t1', { employeeIds: ['e1'] })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/manager/tests/t1/assign',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('listTestInstances calls GET with params', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listTestInstances({ testId: 't1', companyId: 'c1' })
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/manager/testInstances'),
    )
  })

  it('markTestInstance calls POST /manager/testInstances/:id/mark', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await markTestInstance('i1', { marks: [{ questionId: 'q1', isCorrect: true }] })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/manager/testInstances/i1/mark',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('listQuestionLibrary calls GET with companyId', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listQuestionLibrary('c1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/manager/question-library?companyId=c1'),
    )
  })

  it('createQuestionLibraryItems calls POST', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await createQuestionLibraryItems({
      companyId: 'c1',
      managerId: 'm1',
      items: [{ type: 'text', title: 'Q' }],
    })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/manager/question-library',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updateQuestionLibraryItem calls PUT', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await updateQuestionLibraryItem('ql1', { title: 'U' })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/manager/question-library/ql1',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('deleteQuestionLibraryItem calls DELETE', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await deleteQuestionLibraryItem('ql1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/manager/question-library/ql1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('listQuestionCategories calls GET', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listQuestionCategories('c1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/manager/question-categories?companyId=c1'),
    )
  })

  it('createQuestionCategory calls POST', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await createQuestionCategory({ companyId: 'c1', name: 'Safety' })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/manager/question-categories',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updateQuestionCategory calls PUT', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await updateQuestionCategory('qc1', { name: 'Updated' })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/manager/question-categories/qc1',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('deleteQuestionCategory calls DELETE', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await deleteQuestionCategory('qc1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/manager/question-categories/qc1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('getImageUploadUrl calls POST', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await getImageUploadUrl({ companyId: 'c1', contentType: 'image/png' })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/manager/images/upload-url',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
