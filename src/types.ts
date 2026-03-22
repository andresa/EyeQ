export type UUID = string

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  nextCursor?: string | null
  total?: number
}

export type UserRole = 'employee' | 'manager' | 'admin'
export type UserType = 'employee' | 'manager' | 'admin'

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

export interface Manager {
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
  userType: 'employee' | 'manager'
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
export type FlashCardType = Extract<ComponentType, 'single_choice' | 'multiple_choice'>

export interface TestSettings {
  allowBackNavigation: boolean
  timeLimitMinutes?: number | null
}

export interface TestTemplate {
  id: UUID
  companyId: UUID
  managerId: UUID
  name: string
  sections: TestSection[]
  settings?: TestSettings
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
  saveToLibrary?: boolean
  addToFlashCards?: boolean
  categoryId?: string | null
  imageId?: string | null
}

export interface QuestionLibraryItem {
  id: string
  companyId: string
  createdBy: string
  type: ComponentType
  title: string
  description?: string
  required?: boolean
  options?: TestComponentOption[]
  correctAnswer?: string | string[]
  categoryId?: string | null
  imageId?: string | null
  createdAt: string
  updatedAt?: string
}

export interface QuestionCategory {
  id: string
  companyId: string
  name: string
  createdAt: string
  updatedAt?: string
}

export interface ArticleTopic {
  id: string
  companyId: string
  name: string
  createdAt: string
  updatedAt?: string
}

export interface Article {
  id: string
  companyId: string
  createdBy: string
  title: string
  description: string
  topicIds: string[]
  createdAt: string
  updatedAt?: string
}

export interface FlashCard {
  id: string
  companyId: string
  createdBy: string
  type: FlashCardType
  title: string
  options: TestComponentOption[]
  correctAnswer: string | string[]
  imageId?: string | null
  categoryId?: string | null
  createdAt: string
  updatedAt?: string
}

export interface LearningResourcesSettings {
  articlesEnabled: boolean
  flashCardsEnabled: boolean
}

export type TestInstanceStatus =
  | 'assigned'
  | 'opened'
  | 'in-progress'
  | 'completed'
  | 'expired'
  | 'marked'
  | 'timed-out'

export interface TestInstance {
  id: UUID
  testId: UUID
  testName?: string
  /** Number of questions (excluding info components). Used for time estimate. */
  questionCount?: number
  timeLimitMinutes?: number | null
  employeeId: UUID
  assignedByManagerId: UUID
  status: TestInstanceStatus
  assignedAt: string
  openedAt?: string
  expiresAt?: string
  completedAt?: string
  timedOutAt?: string
  markedAt?: string
  score?: number | null
}

export interface TestInstanceDetails {
  instance: TestInstance
  test: TestTemplate
  responses: ResponseRecord[]
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
  markedByManagerId?: UUID
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

// ============================================================================
// Leaderboard
// ============================================================================

export type LeaderboardType = 'top_average_score' | 'top_single_test_score'
export type LeaderboardPeriod = 'week' | 'month'
export type LeaderboardDisplayLimit = 'top5' | 'full'

export interface LeaderboardBoardConfig {
  type: LeaderboardType
  period: LeaderboardPeriod
  displayLimit: LeaderboardDisplayLimit
}

export interface LeaderboardSettings {
  boards: LeaderboardBoardConfig[]
}

export interface LeaderboardEntry {
  rank: number
  employeeId: string
  employeeName: string
  score: number
  testCount: number
}

export interface LeaderboardData {
  board: LeaderboardBoardConfig
  periodLabel: string
  periodStart: string
  periodEnd: string
  entries: LeaderboardEntry[]
  total: number
  offset: number
  limit: number
}
