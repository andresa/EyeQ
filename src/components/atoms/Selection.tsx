import { Select } from 'antd'
import type { DefaultOptionType, RefSelectProps, SelectProps } from 'antd/es/select'
import { forwardRef } from 'react'

export type { RefSelectProps }

function SelectionInner<
  ValueType = unknown,
  OptionType extends DefaultOptionType = DefaultOptionType,
>(props: SelectProps<ValueType, OptionType>, ref: React.Ref<RefSelectProps>) {
  const { onOpenChange, ...rest } = props
  return (
    <Select<ValueType, OptionType>
      {...rest}
      ref={ref}
      onOpenChange={(open) => {
        if (
          !open &&
          typeof window !== 'undefined' &&
          window.matchMedia('(max-width: 767px)').matches
        ) {
          requestAnimationFrame(() => {
            const el = document.activeElement as HTMLElement | null
            if (el?.blur) el.blur()
          })
        }
        onOpenChange?.(open)
      }}
    />
  )
}

const Selection = forwardRef(SelectionInner) as <
  ValueType = unknown,
  OptionType extends DefaultOptionType = DefaultOptionType,
>(
  props: SelectProps<ValueType, OptionType> & { ref?: React.Ref<RefSelectProps> },
) => React.ReactElement

export default Selection
