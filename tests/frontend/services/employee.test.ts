import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/services/api', () => ({
  apiRequest: vi.fn(),
}))

import { apiRequest } from '../../../src/services/api'
import {
  listEmployeeTestInstances,
  fetchTestInstanceDetails,
  openTestInstance,
  saveTestResponses,
  submitTestInstance,
  fetchEmployeeTestInstanceResults,
  timeoutTestInstance,
  listEmployeeArticles,
  listEmployeeArticleTopics,
  getEmployeeArticle,
  listEmployeeFlashCards,
  getEmployeeLearningResourcesSettings,
} from '../../../src/services/employee'

const mockApiRequest = vi.mocked(apiRequest)

describe('services/employee', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listEmployeeTestInstances calls GET with employeeId', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listEmployeeTestInstances('e1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/employee/testInstances?employeeId=e1'),
    )
  })

  it('listEmployeeTestInstances includes filters and pagination params', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listEmployeeTestInstances({
      employeeId: 'e1',
      status: 'assigned',
      name: 'safety',
      limit: 10,
      cursor: 'cursor_1',
    })
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining(
        '/employee/testInstances?employeeId=e1&status=assigned&name=safety&limit=10&cursor=cursor_1',
      ),
    )
  })

  it('fetchTestInstanceDetails calls GET /employee/testInstances/:id', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await fetchTestInstanceDetails('i1')
    expect(mockApiRequest).toHaveBeenCalledWith('/employee/testInstances/i1')
  })

  it('openTestInstance calls POST /employee/testInstances/:id/open', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await openTestInstance('i1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/employee/testInstances/i1/open',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('saveTestResponses calls POST /employee/testInstances/:id/save', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await saveTestResponses('i1', { responses: [{ questionId: 'q1', answer: 'a' }] })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/employee/testInstances/i1/save',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('submitTestInstance calls POST /employee/testInstances/:id/submit', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await submitTestInstance('i1', {
      responses: [{ questionId: 'q1', answer: 'a' }],
      completedAt: '2025-01-01',
    })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/employee/testInstances/i1/submit',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('fetchEmployeeTestInstanceResults calls GET', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await fetchEmployeeTestInstanceResults('i1')
    expect(mockApiRequest).toHaveBeenCalledWith('/employee/testInstances/i1/results')
  })

  it('timeoutTestInstance calls POST /employee/testInstances/:id/timeout', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await timeoutTestInstance('i1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/employee/testInstances/i1/timeout',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('listEmployeeArticles calls GET with companyId', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listEmployeeArticles('c1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/employee/articles?companyId=c1'),
    )
  })

  it('listEmployeeArticles includes topicId and pagination params', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listEmployeeArticles({
      companyId: 'c1',
      topicId: 'at_1',
      limit: 10,
      cursor: 'cursor_1',
    })
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining(
        '/employee/articles?companyId=c1&topicId=at_1&limit=10&cursor=cursor_1',
      ),
    )
  })

  it('listEmployeeArticleTopics calls GET with companyId', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listEmployeeArticleTopics('c1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/employee/article-topics?companyId=c1'),
    )
  })

  it('getEmployeeArticle calls GET /employee/articles/:id', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await getEmployeeArticle('art_1')
    expect(mockApiRequest).toHaveBeenCalledWith('/employee/articles/art_1')
  })

  it('listEmployeeFlashCards calls GET with companyId', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listEmployeeFlashCards('c1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/employee/flash-cards?companyId=c1'),
    )
  })

  it('listEmployeeFlashCards includes pagination params', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listEmployeeFlashCards({
      companyId: 'c1',
      limit: 20,
      cursor: 'cursor_2',
    })
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining(
        '/employee/flash-cards?companyId=c1&limit=20&cursor=cursor_2',
      ),
    )
  })

  it('getEmployeeLearningResourcesSettings calls GET with companyId', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await getEmployeeLearningResourcesSettings('c1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/employee/learning-resources-settings?companyId=c1'),
    )
  })
})
