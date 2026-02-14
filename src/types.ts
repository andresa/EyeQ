export type UUID = string

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export type UserRole = 'employee' | 'employer' | 'admin'
export type UserType = 'employee' | 'employer' | 'admin'

export interface User {
  id: UUID
  email: string
  role?: UserRole
  createdAt: string
}

// User profile returned by /api/shared/me and /api/auth/session
export interface UserProfile {
  id: UUID
  email: string
  firstName: string
  lastName: string
  role: UserRole
  companyId: UUID
  companyName?: string
  lastLogin?: string
  userType: UserType
}

// Response from /api/auth/session
export interface SessionResponse {
  session: {
    expiresAt: string
  }
  user: UserProfile
}

// Response from /api/auth/verify
export interface VerifyResponse {
  token: string
  expiresAt: string
  user: UserProfile
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
  email?: string // Optional - can be set via invitation acceptance
  phone?: string
  role?: UserRole
  createdAt: string
  lastLogin?: string
  isActive: boolean
  invitationStatus?: InvitationStatus
  invitedEmail?: string // Email where invitation was sent
}

export type InvitationStatus = 'none' | 'pending' | 'accepted'

export interface Employee {
  id: UUID
  companyId: UUID
  firstName: string
  lastName: string
  email?: string // Now optional - set via invitation acceptance
  phone?: string
  dob?: string
  role?: UserRole
  createdAt: string
  lastLogin?: string
  isActive: boolean
  invitationStatus?: InvitationStatus
  invitedEmail?: string // Email where invitation was sent
}

export interface Invitation {
  id: UUID
  token: string
  userId: UUID
  userType: 'employee' | 'employer'
  companyId: UUID
  companyName: string
  userName: string
  invitedEmail: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  createdAt: string
  expiresAt: string
  acceptedAt?: string
  acceptedEmail?: string
}

export interface InvitationValidation {
  userName: string
  companyName: string
  expiresAt: string
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
