import { Layout, Menu, Grid, Drawer, Button, Typography } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useState, type ReactNode } from 'react'
import EyeQHeader from '../components/organisms/EyeQHeader'

const { Content, Sider } = Layout

interface AppLayoutProps {
  title: string
  pageHeading?: ReactNode
  items: MenuProps['items']
  footerItems?: MenuProps['items']
  selectedKeys: string[]
  onNavigate: (path: string) => void
  children: ReactNode
}

const AppLayout = ({
  title,
  pageHeading,
  items,
  footerItems,
  selectedKeys,
  onNavigate,
  children,
}: AppLayoutProps) => {
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [drawerOpen, setDrawerOpen] = useState(false)

  const menuProps = {
    mode: 'inline' as const,
    selectedKeys,
    onClick: ({ key }: { key: React.Key }) => {
      onNavigate(String(key))
      if (isMobile) setDrawerOpen(false)
    },
  }

  const navContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center pl-[28px] pr-[20px] h-[60px] border-b border-r border-gray-200">
        <Typography.Title level={5}>{title}</Typography.Title>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto font-medium border-r border-gray-200">
        <Menu {...menuProps} items={items} />
      </div>
      {footerItems?.length ? (
        <div className="mt-auto border-t border-r border-gray-200 font-medium">
          <Menu {...menuProps} items={footerItems} />
        </div>
      ) : null}
    </div>
  )

  return (
    <Layout className="h-screen flex flex-col">
      <EyeQHeader
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
            {navContent}
          </Drawer>
        ) : (
          <Sider width={220} className="bg-white flex flex-col overflow-hidden">
            {navContent}
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
