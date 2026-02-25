import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntApp, ConfigProvider } from 'antd'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'
import { SessionProvider } from './hooks/useSession'
import { antdColourTheme, themeColors } from './theme/colors'
import { ThemeStyles } from './theme/ThemeStyles'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const smallBorderRadius = 2
const mediumBorderRadius = 4
const largeBorderRadius = 6

const buttonBorderRadius = smallBorderRadius
const inputBorderRadius = smallBorderRadius
const selectBorderRadius = smallBorderRadius
const cardBorderRadius = largeBorderRadius
const menuBorderRadius = mediumBorderRadius

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeStyles />
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <BrowserRouter>
          <ConfigProvider
            theme={{
              ...antdColourTheme,
              components: {
                Button: {
                  paddingInline: 8,
                  borderRadius: buttonBorderRadius,
                  borderRadiusLG: buttonBorderRadius,
                  borderRadiusSM: buttonBorderRadius,
                  borderRadiusXS: buttonBorderRadius,
                  fontWeight: 500,
                },
                Typography: {
                  titleMarginBottom: 0,
                  titleMarginTop: 0,
                },
                Input: {
                  borderRadius: inputBorderRadius,
                  borderRadiusLG: inputBorderRadius,
                  borderRadiusSM: inputBorderRadius,
                  borderRadiusXS: inputBorderRadius,
                },
                Select: {
                  borderRadius: selectBorderRadius,
                  borderRadiusLG: selectBorderRadius,
                  borderRadiusSM: selectBorderRadius,
                  borderRadiusXS: selectBorderRadius,
                },
                Card: {
                  bodyPadding: 16,
                  borderRadius: cardBorderRadius,
                  borderRadiusLG: cardBorderRadius,
                  borderRadiusSM: cardBorderRadius,
                  borderRadiusXS: cardBorderRadius,
                },
                Menu: {
                  borderRadius: menuBorderRadius,
                  borderRadiusLG: menuBorderRadius,
                  borderRadiusSM: menuBorderRadius,
                  borderRadiusXS: menuBorderRadius,
                  itemBg: themeColors.headerText,
                  itemSelectedBg: themeColors.accent,
                  itemHoverBg: themeColors.primaryLightest,
                  itemHoverColor: themeColors.primaryDark,
                  itemColor: themeColors.primaryDark,
                  itemSelectedColor: themeColors.headerText,
                },
              },
            }}
          >
            <AntApp>
              <App />
            </AntApp>
          </ConfigProvider>
        </BrowserRouter>
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
)
