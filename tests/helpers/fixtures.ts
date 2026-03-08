import type {
  Company,
  Employee,
  Manager,
  UserProfile,
  TestTemplate,
  TestInstance,
  TestSection,
  TestComponent,
  ResponseRecord,
  QuestionLibraryItem,
  QuestionCategory,
} from '../../src/types'

let counter = 0
const nextId = (prefix: string) => `${prefix}_${++counter}`

export function resetIds() {
  counter = 0
}

export function mockAdmin(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: nextId('admin'),
    email: 'admin@test.com',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'admin',
    companyId: '',
    userType: 'admin',
    ...overrides,
  }
}

export function mockManager(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: nextId('user'),
    email: 'manager@test.com',
    firstName: 'Test',
    lastName: 'Manager',
    role: 'manager',
    companyId: 'company_1',
    companyName: 'Acme Corp',
    userType: 'manager',
    ...overrides,
  }
}

export function mockEmployee(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: nextId('user'),
    email: 'employee@test.com',
    firstName: 'Test',
    lastName: 'Employee',
    role: 'employee',
    companyId: 'company_1',
    companyName: 'Acme Corp',
    userType: 'employee',
    ...overrides,
  }
}

export function mockCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: nextId('company'),
    name: 'Acme Corp',
    address: '123 Main St',
    createdAt: '2025-01-01T00:00:00.000Z',
    isActive: true,
    ...overrides,
  }
}

export function mockManagerRecord(overrides: Partial<Manager> = {}): Manager {
  return {
    id: nextId('user'),
    companyId: 'company_1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@test.com',
    phone: '0412345678',
    role: 'manager',
    createdAt: '2025-01-01T00:00:00.000Z',
    isActive: true,
    invitationStatus: 'none',
    ...overrides,
  }
}

export function mockEmployeeRecord(overrides: Partial<Employee> = {}): Employee {
  return {
    id: nextId('user'),
    companyId: 'company_1',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john@test.com',
    phone: '0412345678',
    role: 'employee',
    createdAt: '2025-01-01T00:00:00.000Z',
    isActive: true,
    invitationStatus: 'none',
    ...overrides,
  }
}

export function mockTestComponent(overrides: Partial<TestComponent> = {}): TestComponent {
  return {
    id: nextId('component'),
    type: 'single_choice',
    title: 'Sample Question',
    description: 'Pick one',
    required: true,
    options: [
      { id: 'opt_1', label: 'Option A' },
      { id: 'opt_2', label: 'Option B' },
    ],
    correctAnswer: 'opt_1',
    ...overrides,
  }
}

export function mockTestSection(overrides: Partial<TestSection> = {}): TestSection {
  return {
    id: nextId('section'),
    title: 'Section 1',
    components: [mockTestComponent()],
    ...overrides,
  }
}

export function mockTestTemplate(overrides: Partial<TestTemplate> = {}): TestTemplate {
  return {
    id: nextId('test'),
    companyId: 'company_1',
    managerId: 'user_1',
    name: 'Safety Test',
    sections: [mockTestSection()],
    settings: { allowBackNavigation: false },
    createdAt: '2025-01-01T00:00:00.000Z',
    isActive: true,
    ...overrides,
  }
}

export function mockTestInstance(overrides: Partial<TestInstance> = {}): TestInstance {
  return {
    id: nextId('instance'),
    testId: 'test_1',
    testName: 'Safety Test',
    employeeId: 'user_1',
    assignedByManagerId: 'user_2',
    status: 'assigned',
    assignedAt: '2025-01-01T00:00:00.000Z',
    expiresAt: '2025-12-31T23:59:59.000Z',
    ...overrides,
  }
}

export function mockResponseRecord(
  overrides: Partial<ResponseRecord> = {},
): ResponseRecord {
  return {
    id: nextId('response'),
    testInstanceId: 'instance_1',
    questionId: 'component_1',
    answer: 'opt_1',
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function mockQuestionLibraryItem(
  overrides: Partial<QuestionLibraryItem> = {},
): QuestionLibraryItem {
  return {
    id: nextId('ql'),
    companyId: 'company_1',
    createdBy: 'user_1',
    type: 'single_choice',
    title: 'Library Question',
    description: 'A question from the library',
    options: [
      { id: 'opt_1', label: 'A' },
      { id: 'opt_2', label: 'B' },
    ],
    correctAnswer: 'opt_1',
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function mockQuestionCategory(
  overrides: Partial<QuestionCategory> = {},
): QuestionCategory {
  return {
    id: nextId('qc'),
    companyId: 'company_1',
    name: 'Safety',
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  }
}
