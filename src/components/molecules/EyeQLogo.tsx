import clsx from 'clsx'
import logoSmall from '../../assets/images/EyeQ Logo-75px.png'
import logoMedium from '../../assets/images/EyeQ Logo-120px.png'
import logoLarge from '../../assets/images/EyeQ Logo-480px.png'

const sizes = {
  small: {
    className: 'h-11 w-11',
    src: logoSmall,
  },
  medium: {
    className: 'h-20 w-20',
    src: logoMedium,
  },
  large: {
    className: 'h-40 w-40',
    src: logoLarge,
  },
}

type EyeQLogoProps = {
  size: 'small' | 'medium' | 'large'
  shadow?: boolean
  rounded?: boolean
}
export const EyeQLogo = ({ size, shadow, rounded }: EyeQLogoProps) => {
  return (
    <img
      src={sizes[size].src}
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
