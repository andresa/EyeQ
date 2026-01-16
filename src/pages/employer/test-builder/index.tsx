import {
  Button,
  Card,
  Input,
  Space,
  Typography,
  message,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import EmployerLayout from '../../../layouts/EmployerLayout'
import CompanyEmployerSelector from '../../../components/molecules/CompanyEmployerSelector'
import SectionList from '../../../components/test-builder/SectionList'
import ComponentCard from '../../../components/test-builder/ComponentCard'
import { createUUID } from '../../../utils/uuid'
import type { ComponentType, TestComponent, TestSection, TestTemplate } from '../../../types'
import { createTestTemplate, listTests, updateTestTemplate } from '../../../services/employer'
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

const TestBuilderPage = () => {
  const navigate = useNavigate()
  const { testId } = useParams()
  const { session } = useSession()
  const companyId = session?.companyId
  const employerId = session?.employerId

  const [name, setName] = useState('')
  const [sections, setSections] = useState<TestSection[]>([])
  const [selectedSectionId, setSelectedSectionId] = useState<string>('')

  const { data: tests } = useQuery({
    queryKey: ['employer', 'tests', companyId],
    queryFn: async () => {
      if (!companyId) return [] as TestTemplate[]
      const response = await listTests(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load tests')
      }
      return response.data
    },
  })

  const activeSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId),
    [sections, selectedSectionId],
  )

  useEffect(() => {
    if (!testId || !tests) return
    const existing = tests.find((test) => test.id === testId)
    if (!existing) return
    setName(existing.name)
    setSections(existing.sections)
    setSelectedSectionId(existing.sections[0]?.id || '')
  }, [testId, tests])

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
    setSections((prev) => prev.map((section) => (section.id === id ? { ...section, title } : section)))
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
              components: section.components.filter((component) => component.id !== componentId),
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

  const handleSave = async () => {
    if (!companyId || !employerId) {
      message.error('Select a company and employer first.')
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
    const payload = {
      companyId,
      employerId,
      name,
      sections,
    }

    const response = testId
      ? await updateTestTemplate(testId, payload)
      : await createTestTemplate(payload)

    if (!response.success) {
      message.error(response.error || 'Unable to save test')
      return
    }
    message.success('Test saved')
    navigate('/employer/tests')
  }

  return (
    <EmployerLayout>
      <Space orientation="vertical" size="large" className="w-full">
        <Typography.Title level={3}>Test builder</Typography.Title>
        <CompanyEmployerSelector />
        <Card>
          <Space orientation="vertical" className="w-full">
            <Typography.Text strong>Test name</Typography.Text>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Safety Induction"
              aria-label="Test name"
            />
          </Space>
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
            <Space orientation="vertical" className="w-full">
              <Typography.Text strong>Component palette</Typography.Text>
              {componentPalette.map((item) => (
                <Button key={item.type} onClick={() => addComponentToSection(item.type)}>
                  {item.label}
                </Button>
              ))}
            </Space>
          </Card>
        </div>
        <Space>
          <Button onClick={() => navigate('/employer/tests')}>Cancel</Button>
          <Button type="primary" onClick={handleSave}>
            Save test
          </Button>
        </Space>
      </Space>
    </EmployerLayout>
  )
}

export default TestBuilderPage
