import { Layout, Menu, Grid, Drawer, Button } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useState, type ReactNode } from 'react'
import EyeQHeader from '../components/organisms/EyeQHeader'

const { Content, Sider } = Layout

interface AppLayoutProps {
  title: string
  pageHeading?: ReactNode
  items: MenuProps['items']
  selectedKeys: string[]
  onNavigate: (path: string) => void
  children: ReactNode
}

const AppLayout = ({
  title,
  pageHeading,
  items,
  selectedKeys,
  onNavigate,
  children,
}: AppLayoutProps) => {
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navMenu = (
    <Menu
      mode="inline"
      className="p-2"
      items={items}
      selectedKeys={selectedKeys}
      onClick={({ key }) => {
        onNavigate(String(key))
        if (isMobile) setDrawerOpen(false)
      }}
    />
  )

  return (
    <Layout className="h-screen flex flex-col">
      <EyeQHeader
        title={title}
        menuButton={
          isMobile ? (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
              className="!text-white"
            />
          ) : undefined
        }
      />
      <Layout className="flex-1 !flex-row overflow-hidden">
        {isMobile ? (
          <Drawer
            placement="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            size={'70vw'}
            styles={{ body: { padding: 0 } }}
          >
            {navMenu}
          </Drawer>
        ) : (
          <Sider width={220} className="bg-white overflow-y-auto">
            {navMenu}
          </Sider>
        )}
        <Layout className="flex-1 flex flex-col overflow-hidden">
          {pageHeading}
          <Content
            className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full"
            data-main-scroll
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default AppLayout
