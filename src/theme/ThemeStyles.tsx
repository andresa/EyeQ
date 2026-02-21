import { getCssVariables } from './colors'

/** Injects theme CSS variables into the document. Keeps theme/colors.ts as single source of truth. */
export function ThemeStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: getCssVariables(),
      }}
    />
  )
}
