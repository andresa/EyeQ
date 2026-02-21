import { Button, Card, Input, Spin, Typography, message } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ManagerLayout from '../../../layouts/ManagerLayout'
import SectionList from '../../../components/test-builder/SectionList'
import ComponentCard from '../../../components/test-builder/ComponentCard'
import { createUUID } from '../../../utils/uuid'
import TestSettingsModal from '../../../components/test-builder/TestSettingsModal'
import QuestionLibraryModal from '../../../components/test-builder/QuestionLibraryModal'
import type {
  ComponentType,
  TestComponent,
  TestSection,
  TestSettings,
  TestTemplate,
} from '../../../types'
import {
  createQuestionLibraryItems,
  createTestTemplate,
  listTests,
  updateTestTemplate,
} from '../../../services/manager'
import { useSession } from '../../../hooks/useSession'

const componentPalette: { type: ComponentType; label: string }[] = [
  { type: 'single_choice', label: 'Single choice' },
  { type: 'multiple_choice', label: 'Multiple choice' },
  { type: 'text', label: 'Text response' },
  { type: 'info', label: 'Info block' },
]

const createComponent = (type: ComponentType): TestComponent => {
  const base = {
    id: createUUID(),
    type,
    title: '',
    description: '',
    required: false,
  }
  if (type === 'single_choice' || type === 'multiple_choice') {
    return {
      ...base,
      options: [
        { id: createUUID(), label: 'Option 1' },
        { id: createUUID(), label: 'Option 2' },
      ],
    }
  }
  return base
}

interface TestBuilderFormProps {
  testId?: string
  existingTest?: TestTemplate
  companyId?: string
  managerId?: string
}

const TestBuilderForm = ({
  testId,
  existingTest,
  companyId,
  managerId,
}: TestBuilderFormProps) => {
  const navigate = useNavigate()

  const [name, setName] = useState(existingTest?.name || '')
  const [sections, setSections] = useState<TestSection[]>(existingTest?.sections || [])
  const [settings, setSettings] = useState<TestSettings>(
    existingTest?.settings ?? { allowBackNavigation: false },
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    existingTest?.sections[0]?.id || '',
  )

  const activeSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId),
    [sections, selectedSectionId],
  )

  const addSection = () => {
    const newSection = {
      id: createUUID(),
      title: `Section ${sections.length + 1}`,
      components: [],
    }
    setSections((prev) => [...prev, newSection])
    setSelectedSectionId(newSection.id)
  }

  const renameSection = (id: string, title: string) => {
    setSections((prev) =>
      prev.map((section) => (section.id === id ? { ...section, title } : section)),
    )
  }

  const moveSection = (id: string, direction: 'up' | 'down') => {
    setSections((prev) => {
      const index = prev.findIndex((section) => section.id === id)
      if (index === -1) return prev
      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= prev.length) return prev
      const updated = [...prev]
      const [removed] = updated.splice(index, 1)
      updated.splice(newIndex, 0, removed)
      return updated
    })
  }

  const deleteSection = (id: string) => {
    const remaining = sections.filter((section) => section.id !== id)
    setSections(remaining)
    if (selectedSectionId === id) {
      setSelectedSectionId(remaining[0]?.id || '')
    }
  }

  const addComponentToSection = (type: ComponentType) => {
    if (!selectedSectionId) {
      message.error('Select a section first.')
      return
    }
    setSections((prev) =>
      prev.map((section) =>
        section.id === selectedSectionId
          ? {
              ...section,
              components: [...section.components, createComponent(type)],
            }
          : section,
      ),
    )
  }

  const updateComponent = (componentId: string, updates: TestComponent) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === selectedSectionId
          ? {
              ...section,
              components: section.components.map((component) =>
                component.id === componentId ? updates : component,
              ),
            }
          : section,
      ),
    )
  }

  const removeComponent = (componentId: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === selectedSectionId
          ? {
              ...section,
              components: section.components.filter(
                (component) => component.id !== componentId,
              ),
            }
          : section,
      ),
    )
  }

  const moveComponent = (componentId: string, direction: 'up' | 'down') => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== selectedSectionId) return section
        const index = section.components.findIndex(
          (component) => component.id === componentId,
        )
        if (index === -1) return section
        const newIndex = direction === 'up' ? index - 1 : index + 1
        if (newIndex < 0 || newIndex >= section.components.length) return section
        const updated = [...section.components]
        const [removed] = updated.splice(index, 1)
        updated.splice(newIndex, 0, removed)
        return {
          ...section,
          components: updated,
        }
      }),
    )
  }

  const addFromLibrary = useCallback(
    (components: TestComponent[]) => {
      if (!selectedSectionId) {
        message.error('Select a section first.')
        return
      }
      setSections((prev) =>
        prev.map((section) =>
          section.id === selectedSectionId
            ? { ...section, components: [...section.components, ...components] }
            : section,
        ),
      )
      message.success(
        `${components.length} question${components.length === 1 ? '' : 's'} added from library`,
      )
    },
    [selectedSectionId],
  )

  const handleSave = async () => {
    if (!companyId || !managerId) {
      message.error('Select a company and manager first.')
      return
    }
    if (!name) {
      message.error('Enter a test name.')
      return
    }
    if (sections.length === 0) {
      message.error('Add at least one section.')
      return
    }

    const libraryItems = sections
      .flatMap((s) => s.components)
      .filter((c) => c.saveToLibrary && c.title)

    const cleanedSections = sections.map((section) => ({
      ...section,
      components: section.components.map((c) => {
        const { saveToLibrary, ...rest } = c
        void saveToLibrary
        return rest
      }),
    }))

    const payload = {
      companyId,
      managerId,
      name,
      sections: cleanedSections,
      settings,
    }

    const response = testId
      ? await updateTestTemplate(testId, payload)
      : await createTestTemplate(payload)

    if (!response.success) {
      message.error(response.error || 'Unable to save test')
      return
    }

    if (libraryItems.length > 0) {
      await createQuestionLibraryItems({
        companyId,
        managerId,
        items: libraryItems.map((c) => ({
          type: c.type,
          title: c.title!,
          description: c.description,
          required: c.required,
          options: c.options,
          correctAnswer: c.correctAnswer,
        })),
      })
    }

    message.success('Test saved')
    navigate('/manager/tests')
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <Typography.Title level={3}>Test builder</Typography.Title>
      <Card>
        <div className="flex flex-col gap-4 w-full">
          <Typography.Text strong>Test name</Typography.Text>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Safety Induction"
            aria-label="Test name"
          />
        </div>
      </Card>
      <div className="builder-grid">
        <SectionList
          sections={sections}
          selectedId={selectedSectionId}
          onSelect={setSelectedSectionId}
          onAdd={addSection}
          onRename={renameSection}
          onMove={moveSection}
          onDelete={deleteSection}
        />
        <div>
          {activeSection ? (
            <>
              <Typography.Title level={4}>{activeSection.title}</Typography.Title>
              {activeSection.components.length === 0 ? (
                <Card>
                  <Typography.Text type="secondary">
                    Add components to start building this section.
                  </Typography.Text>
                </Card>
              ) : null}
              {activeSection.components.map((component, index) => (
                <ComponentCard
                  key={component.id}
                  component={component}
                  index={index}
                  onChange={(updated) => updateComponent(component.id, updated)}
                  onMove={(direction) => moveComponent(component.id, direction)}
                  onDelete={() => removeComponent(component.id)}
                />
              ))}
            </>
          ) : (
            <Card>
              <Typography.Text type="secondary">
                Select or create a section to start editing.
              </Typography.Text>
            </Card>
          )}
        </div>
        <Card>
          <div className="flex flex-col gap-4 w-full">
            <Typography.Text strong>Component palette</Typography.Text>
            <Button type="dashed" onClick={() => setLibraryOpen(true)}>
              Select from library
            </Button>
            {componentPalette.map((item) => (
              <Button key={item.type} onClick={() => addComponentToSection(item.type)}>
                {item.label}
              </Button>
            ))}
          </div>
        </Card>
      </div>
      <div className="flex gap-4">
        <Button onClick={() => navigate('/manager/tests')}>Cancel</Button>
        <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)}>
          Settings
        </Button>
        <Button type="primary" onClick={handleSave}>
          Save test
        </Button>
      </div>
      <TestSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={async (updated) => {
          setSettings(updated)
          if (testId) {
            const response = await updateTestTemplate(testId, { settings: updated })
            if (!response.success) {
              message.error(response.error || 'Unable to save settings')
              return
            }
            message.success('Settings saved')
          }
        }}
      />
      {companyId && (
        <QuestionLibraryModal
          open={libraryOpen}
          companyId={companyId}
          onAdd={addFromLibrary}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </div>
  )
}

const TestBuilderPage = () => {
  const { testId } = useParams()
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId
  const managerId = userProfile?.userType === 'manager' ? userProfile.id : undefined

  const { data: tests, isLoading } = useQuery({
    queryKey: ['manager', 'tests', companyId],
    queryFn: async () => {
      if (!companyId) return [] as TestTemplate[]
      const response = await listTests(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load tests')
      }
      return response.data
    },
  })

  const existingTest = useMemo(
    () => (testId && tests ? tests.find((test) => test.id === testId) : undefined),
    [testId, tests],
  )

  // Show loading while fetching existing test
  if (testId && isLoading) {
    return (
      <ManagerLayout>
        <div className="flex justify-center items-center h-full">
          <Spin />
        </div>
      </ManagerLayout>
    )
  }

  return (
    <ManagerLayout>
      <TestBuilderForm
        key={testId || 'new'}
        testId={testId}
        existingTest={existingTest}
        companyId={companyId}
        managerId={managerId}
      />
    </ManagerLayout>
  )
}

export default TestBuilderPage
