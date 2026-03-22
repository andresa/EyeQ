import { App, Button, Card, Spin, Switch, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  getLearningResourcesSettings,
  updateLearningResourcesSettings,
} from '../../services/manager'
import type { LearningResourcesSettings } from '../../types'

interface LearningResourcesSettingsSectionProps {
  companyId: string
}

interface LearningResourcesSettingsFormProps {
  initialSettings: LearningResourcesSettings
  onSave: (settings: LearningResourcesSettings) => void
  isSaving: boolean
}

const LearningResourcesSettingsForm = ({
  initialSettings,
  onSave,
  isSaving,
}: LearningResourcesSettingsFormProps) => {
  const [settings, setSettings] = useState(initialSettings)

  return (
    <Card size="small" className="w-full">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <Typography.Text strong>Articles</Typography.Text>
            <Typography.Text type="secondary">
              Show the Articles tab to employees.
            </Typography.Text>
          </div>
          <Switch
            checked={settings.articlesEnabled}
            onChange={(articlesEnabled) =>
              setSettings((prev) => ({ ...prev, articlesEnabled }))
            }
            aria-label="Enable articles"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <Typography.Text strong>Flash Cards</Typography.Text>
            <Typography.Text type="secondary">
              Show the Flash Cards tab to employees.
            </Typography.Text>
          </div>
          <Switch
            checked={settings.flashCardsEnabled}
            onChange={(flashCardsEnabled) =>
              setSettings((prev) => ({ ...prev, flashCardsEnabled }))
            }
            aria-label="Enable flash cards"
          />
        </div>

        <div className="flex justify-end">
          <Button type="primary" onClick={() => onSave(settings)} loading={isSaving}>
            Save
          </Button>
        </div>
      </div>
    </Card>
  )
}

const LearningResourcesSettingsSection = ({
  companyId,
}: LearningResourcesSettingsSectionProps) => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['learning-resources-settings', companyId],
    queryFn: async () => {
      const response = await getLearningResourcesSettings(companyId)
      if (!response.success || !response.data) throw new Error(response.error)
      return response.data
    },
  })

  const mutation = useMutation({
    mutationFn: async (settings: LearningResourcesSettings) => {
      const response = await updateLearningResourcesSettings({
        companyId,
        ...settings,
      })
      if (!response.success || !response.data) throw new Error(response.error)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['learning-resources-settings', companyId],
      })
      queryClient.invalidateQueries({
        queryKey: ['employee-learning-resources-settings'],
      })
      message.success('Learning resources settings saved.')
    },
    onError: (error: Error) => {
      message.error(error.message || 'Failed to save settings.')
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin />
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <Typography.Text type="secondary">
        Control which learning resource tabs appear for employees. The Learning Resources
        menu appears automatically when at least one option is enabled.
      </Typography.Text>

      <LearningResourcesSettingsForm
        key={JSON.stringify(data)}
        initialSettings={data ?? { articlesEnabled: false, flashCardsEnabled: false }}
        onSave={(settings) => mutation.mutate(settings)}
        isSaving={mutation.isPending}
      />
    </div>
  )
}

export default LearningResourcesSettingsSection
