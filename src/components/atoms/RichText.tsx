import { Fragment, type ReactNode } from 'react'

interface RichTextProps {
  content?: string
  className?: string
}

const INLINE_MD = /(\[([^\]]+)\]\(([^)]+)\))|\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*/g

function parseInline(text: string): ReactNode[] {
  const result: ReactNode[] = []
  const regex = new RegExp(INLINE_MD.source, INLINE_MD.flags)
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index))
    }

    if (match[1]) {
      result.push(
        <a
          key={match.index}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-700 underline hover:text-accent-500"
        >
          {parseInline(match[2])}
        </a>,
      )
    } else if (match[4] !== undefined) {
      result.push(
        <strong key={match.index}>
          <em>{parseInline(match[4])}</em>
        </strong>,
      )
    } else if (match[5] !== undefined) {
      result.push(<strong key={match.index}>{parseInline(match[5])}</strong>)
    } else if (match[6] !== undefined) {
      result.push(<em key={match.index}>{parseInline(match[6])}</em>)
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex))
  }

  return result
}

const RichText = ({ content, className }: RichTextProps) => {
  if (!content) return null

  const paragraphs = content.split(/\n\n+/)

  return (
    <span className={className}>
      {paragraphs.map((paragraph, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <>
              <br />
              <br />
            </>
          )}
          {parseInline(paragraph)}
        </Fragment>
      ))}
    </span>
  )
}

export default RichText
