import { Layout, Menu, Grid, Drawer, Button } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useState, type ReactNode } from 'react'
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
    <Layout className="min-h-screen">
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
      <Layout>
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
          <Sider width={220} className="bg-white">
            {navMenu}
          </Sider>
        )}
        <Layout className="p-6 max-w-7xl mx-auto">
          <Content>{children}</Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default AppLayout
