import { Card, Spin, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import EmployeeLayout from '../../layouts/EmployeeLayout'
import RichText from '../../components/atoms/RichText'
import { fetchEmployeeTestInstanceResults } from '../../services/employee'
import StandardPageHeading from '../../components/molecules/StandardPageHeading'
import { ClipboardList } from 'lucide-react'
import QuestionImage from '../../components/atoms/QuestionImage'
import {
  buildResponseMap,
  resolveAnswer,
  getAnswerOptionImageIds,
} from '../manager/submission-utils'

const EmployeeTestResultsPage = () => {
  const { instanceId } = useParams()

  const { data, isLoading } = useQuery({
    queryKey: ['employee', 'testInstanceResults', instanceId],
    queryFn: async () => {
      if (!instanceId) return null
      const response = await fetchEmployeeTestInstanceResults(instanceId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load results')
      }
      return response.data
    },
  })

  const responseMap = useMemo(() => buildResponseMap(data?.responses || []), [data])

  if (isLoading || !data) {
    return (
      <EmployeeLayout>
        <div className="flex justify-center items-center h-full">
          <Spin />
        </div>
      </EmployeeLayout>
    )
  }

  const isMarked = data.instance.status === 'marked'

  return (
    <EmployeeLayout
      pageHeading={
        <StandardPageHeading
          title={data.test.name}
          icon={<ClipboardList />}
          backTo="/employee/tests"
        />
      }
    >
      <div className="flex flex-col gap-6 w-full">
        {data.test.sections.map((section) => (
          <Card key={section.id} title={section.title}>
            <div className="flex flex-col gap-4 w-full">
              {section.components.map((component) => {
                if (component.type === 'info') {
                  return (
                    <Card key={component.id} type="inner">
                      <Typography.Text strong>
                        <RichText content={component.title} />
                      </Typography.Text>
                      <Typography.Paragraph>
                        <RichText content={component.description} />
                      </Typography.Paragraph>
                      <QuestionImage imageId={component.imageId} />
                    </Card>
                  )
                }
                const response = responseMap.get(component.id)
                const answerImageIds = getAnswerOptionImageIds(component, response)
                return (
                  <Card key={component.id} type="inner">
                    <Typography.Text strong>
                      <RichText content={component.title} />
                    </Typography.Text>
                    <Typography.Paragraph type="secondary">
                      <RichText content={component.description} />
                    </Typography.Paragraph>
                    <QuestionImage imageId={component.imageId} />
                    <Typography.Text>
                      {resolveAnswer(component, response)}
                    </Typography.Text>
                    {answerImageIds.map((imgId) => (
                      <QuestionImage key={imgId} imageId={imgId} compact />
                    ))}
                    {isMarked ? (
                      <div className="flex gap-4 mt-2">
                        {response?.isCorrect ? (
                          <Tag color="green">Correct</Tag>
                        ) : (
                          <Tag color="red">Incorrect</Tag>
                        )}
                        {response?.note ? (
                          <Typography.Text type="secondary">
                            Note: {response.note}
                          </Typography.Text>
                        ) : null}
                      </div>
                    ) : null}
                  </Card>
                )
              })}
            </div>
          </Card>
        ))}
      </div>
    </EmployeeLayout>
  )
}

export default EmployeeTestResultsPage
