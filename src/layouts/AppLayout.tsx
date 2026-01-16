import { Layout, Menu, Grid } from 'antd'
import type { MenuProps } from 'antd'
import type { ReactNode } from 'react'
import EyeQHeader from '../components/organisms/EyeQHeader'

const { Content, Sider } = Layout

interface AppLayoutProps {
  title: string
  items: MenuProps['items']
  selectedKeys: string[]
  onNavigate: (path: string) => void
  children: ReactNode
}

const AppLayout = ({
  title,
  items,
  selectedKeys,
  onNavigate,
  children,
}: AppLayoutProps) => {
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  return (
    <Layout className="min-h-screen">
      <EyeQHeader title={title} />
      <Layout>
        <Sider
          breakpoint="md"
          collapsedWidth={isMobile ? 0 : 80}
          width={220}
          className="bg-white"
        >
          <Menu
            mode="inline"
            items={items}
            selectedKeys={selectedKeys}
            onClick={({ key }) => onNavigate(String(key))}
          />
        </Sider>
        <Layout className="p-6">
          <Content>{children}</Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default AppLayout
