import type { ReactNode } from 'react'

interface PageHeadingProps {
  children: ReactNode
}

const PageHeading = ({ children }: PageHeadingProps) => (
  <div className="h-[60px] flex-shrink-0 flex items-center justify-between px-6 bg-white border-b border-neutral-200">
    {children}
  </div>
)

export default PageHeading
