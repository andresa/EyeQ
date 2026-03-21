import clsx from 'clsx'
import logoWhiteSmallTransparent from '../../assets/images/EyeQLogo-white-transparent-75px.png'
import logoWhiteMediumTransparent from '../../assets/images/EyeQLogo-white-transparent-150px.png'
import logoWhiteLargeTransparent from '../../assets/images/EyeQLogo-white-transparent-512px.png'
import logoBlueSmallTransparent from '../../assets/images/EyeQLogo-blue-transparent-75px.png'
import logoBlueMediumTransparent from '../../assets/images/EyeQLogo-blue-transparent-150px.png'
import logoBlueLargeTransparent from '../../assets/images/EyeQLogo-blue-transparent-512px.png'
const sizes = {
  small: {
    className: 'h-11 w-11',
    white: logoWhiteSmallTransparent,
    blue: logoBlueSmallTransparent,
  },
  medium: {
    className: 'h-20 w-20',
    white: logoWhiteMediumTransparent,
    blue: logoBlueMediumTransparent,
  },
  large: {
    className: 'h-40 w-40',
    white: logoWhiteLargeTransparent,
    blue: logoBlueLargeTransparent,
  },
}

type EyeQLogoProps = {
  size: 'small' | 'medium' | 'large'
  shadow?: boolean
  rounded?: boolean
  color?: 'white' | 'blue'
}
export const EyeQLogo = ({ size, shadow, rounded, color = 'blue' }: EyeQLogoProps) => {
  return (
    <img
      src={sizes[size][color]}
      alt="EyeQ"
      className={clsx(
        'object-contain',
        rounded && 'rounded',
        shadow && 'drop-shadow-sm',
        sizes[size].className,
      )}
    />
  )
}
