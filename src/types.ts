export type UUID = string

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export type UserRole = 'employee' | 'employer' | 'admin'

export interface User {
  id: UUID
  email: string
  role?: UserRole
  createdAt: string
}

export interface Session {
  email: string
  role?: UserRole
  companyId?: UUID
  employerId?: UUID
  employeeId?: UUID
}

export interface Company {
  id: UUID
  name: string
  address?: string
  createdAt: string
  isActive: boolean
}

export interface Employer {
  id: UUID
  companyId: UUID
  firstName: string
  lastName: string
  email: string
  phone?: string
  createdAt: string
  isActive: boolean
}

export interface Employee {
  id: UUID
  companyId: UUID
  firstName: string
  lastName: string
  email: string
  phone?: string
  dob?: string
  createdAt: string
  isActive: boolean
}

export type ComponentType = 'single_choice' | 'multiple_choice' | 'text' | 'info'

export interface TestTemplate {
  id: UUID
  companyId: UUID
  employerId: UUID
  name: string
  sections: TestSection[]
  createdAt: string
  updatedAt?: string
  isActive: boolean
}

export interface TestSection {
  id: UUID
  title: string
  components: TestComponent[]
}

export interface TestComponentOption {
  id: UUID
  label: string
}

export interface TestComponent {
  id: UUID
  type: ComponentType
  title?: string
  description?: string
  required?: boolean
  options?: TestComponentOption[]
  correctAnswer?: string | string[]
}

export type TestInstanceStatus = 'pending' | 'completed' | 'expired' | 'marked'

export interface TestInstance {
  id: UUID
  testId: UUID
  testName?: string
  employeeId: UUID
  assignedByEmployerId: UUID
  status: TestInstanceStatus
  assignedAt: string
  expiresAt?: string
  completedAt?: string
  markedAt?: string
  score?: number | null
}

export interface TestInstanceDetails {
  instance: TestInstance
  test: TestTemplate
}

export interface ResponseRecord {
  id: UUID
  testInstanceId: UUID
  questionId: UUID
  answer: string | string[] | null
  textAnswer?: string | null
  correctAnswer?: string | string[] | null
  isCorrect?: boolean | null
  note?: string | null
  markedAt?: string
  markedByEmployerId?: UUID
  createdAt: string
}

export interface TestInstanceResults {
  instance: TestInstance
  test: TestTemplate
  responses: ResponseRecord[]
}

export interface ResponsePayload {
  questionId: UUID
  answer: string | string[] | null
  textAnswer?: string | null
}
