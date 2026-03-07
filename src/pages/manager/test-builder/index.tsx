import { useAutoAnimate } from '@formkit/auto-animate/react'
import { Button, Card, Input, Spin, Typography, App } from 'antd'
import { SaveOutlined, SettingOutlined } from '@ant-design/icons'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ManagerLayout from '../../../layouts/ManagerLayout'
import StandardPageHeading from '../../../components/molecules/StandardPageHeading'
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
import { LibraryBig } from 'lucide-react'
import { getQuestionTypeIcon, questionTypeLabels } from '../../../utils/questions'

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
  companyId?: string
  sections: TestSection[]
  onSectionsChange: React.Dispatch<React.SetStateAction<TestSection[]>>
  settings: TestSettings
  onSettingsChange: React.Dispatch<React.SetStateAction<TestSettings>>
  settingsOpen: boolean
  onSettingsOpenChange: (open: boolean) => void
}

const TestBuilderForm = ({
  testId,
  companyId,
  sections,
  onSectionsChange: setSections,
  settings,
  onSettingsChange: setSettings,
  settingsOpen,
  onSettingsOpenChange: setSettingsOpen,
}: TestBuilderFormProps) => {
  const { message } = App.useApp()

  const [libraryOpen, setLibraryOpen] = useState(false)
  const [componentsAnimateRef] = useAutoAnimate({ duration: 250 })
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    sections[0]?.id || '',
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
    [selectedSectionId, message, setSections],
  )

  return (
    <div className="flex flex-col gap-6 w-full flex-1 min-h-0 overflow-hidden">
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* left pane */}
        <div className="flex-1 max-w-[300px] min-w-[200px] overflow-y-auto">
          <SectionList
            sections={sections}
            selectedId={selectedSectionId}
            onSelect={setSelectedSectionId}
            onAdd={addSection}
            onRename={renameSection}
            onMove={moveSection}
            onDelete={deleteSection}
          />
        </div>
        {/* middle pane */}
        <div className="flex-[2_1_0] max-w-[800px] min-w-0 flex flex-col min-h-0 gap-4">
          {activeSection ? (
            <>
              {activeSection.components.length === 0 ? (
                <Card className="shrink-0">
                  <Typography.Text type="secondary">
                    Add components to start building this section.
                  </Typography.Text>
                </Card>
              ) : null}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div
                  ref={componentsAnimateRef}
                  className="flex flex-col gap-4 overflow-visible"
                >
                  {activeSection.components.map((component, index) => (
                    <ComponentCard
                      key={component.id}
                      component={component}
                      index={index}
                      componentsCount={activeSection.components.length}
                      companyId={companyId}
                      onChange={(updated) => updateComponent(component.id, updated)}
                      onMove={(direction) => moveComponent(component.id, direction)}
                      onDelete={() => removeComponent(component.id)}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <Card>
              <Typography.Text type="secondary">
                Select or create a section to start editing.
              </Typography.Text>
            </Card>
          )}
        </div>
        {/* right pane */}
        <div className="flex-1 max-w-[300px] min-w-[200px] flex flex-col gap-4 overflow-y-auto">
          <Card className="h-full">
            <div className="flex flex-col gap-4 w-full">
              <Typography.Text strong>Components</Typography.Text>
              <Button
                type="dashed"
                icon={<LibraryBig size={20} />}
                onClick={() => setLibraryOpen(true)}
              >
                Copy from library
              </Button>
              {questionTypeLabels.map((item) => (
                <Button
                  key={item.value}
                  icon={getQuestionTypeIcon(item.value, 20)}
                  onClick={() => addComponentToSection(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </Card>
        </div>
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
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId
  const managerId = userProfile?.userType === 'manager' ? userProfile.id : undefined
  const [name, setName] = useState('')
  const [nameInitialized, setNameInitialized] = useState(!testId)
  const [sections, setSections] = useState<TestSection[]>([])
  const [settings, setSettings] = useState<TestSettings>({ allowBackNavigation: false })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [stateInitialized, setStateInitialized] = useState(!testId)
  const [isSaving, setIsSaving] = useState(false)

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

  if (existingTest && !nameInitialized) {
    setName(existingTest.name || '')
    setNameInitialized(true)
  }

  if (existingTest && !stateInitialized) {
    setSections(existingTest.sections || [])
    setSettings(existingTest.settings ?? { allowBackNavigation: false })
    setStateInitialized(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
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
            categoryId: c.categoryId,
          })),
        })
      }

      message.success('Test saved')
      navigate('/manager/tests')
      setIsSaving(false)
    } catch (error) {
      console.error(error)
      message.error('Unable to save test')
      setIsSaving(false)
    }
  }

  const heading = (
    <StandardPageHeading
      backTo="/manager/tests"
      title={
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Untitled test"
          variant="underlined"
          className="font-semibold text-xl"
          aria-label="Test name"
        />
      }
      actions={
        <div className="flex gap-2 shrink-0 ml-4">
          <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)}>
            Settings
          </Button>
          <Button
            icon={<SaveOutlined />}
            type="primary"
            onClick={handleSave}
            loading={isSaving}
          >
            Save
          </Button>
        </div>
      }
    />
  )

  if (testId && isLoading) {
    return (
      <ManagerLayout pageHeading={heading} maxWidth="wide">
        <div className="flex justify-center items-center h-full">
          <Spin />
        </div>
      </ManagerLayout>
    )
  }

  return (
    <ManagerLayout pageHeading={heading} maxWidth="wide">
      <TestBuilderForm
        key={testId || 'new'}
        testId={testId}
        companyId={companyId}
        sections={sections}
        onSectionsChange={setSections}
        settings={settings}
        onSettingsChange={setSettings}
        settingsOpen={settingsOpen}
        onSettingsOpenChange={setSettingsOpen}
      />
    </ManagerLayout>
  )
}

export default TestBuilderPage
