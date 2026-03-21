import { useState, useCallback, useRef, useEffect, forwardRef } from 'react'
import { useEditor, useEditorState, EditorContent } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Link from '@tiptap/extension-link'
import History from '@tiptap/extension-history'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { Plugin } from '@tiptap/pm/state'
import { Popover, Input, Button } from 'antd'
import type { InputRef } from 'antd'
import { Bold as BoldIcon, Italic as ItalicIcon, Link2 as LinkIcon } from 'lucide-react'
import clsx from 'clsx'

const SingleLineDoc = Document.extend({ content: 'block' })

const SingleLine = Extension.create({
  name: 'singleLine',
  addKeyboardShortcuts() {
    return {
      Enter: () => true,
      'Shift-Enter': () => true,
    }
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste(view, event) {
            const text = event.clipboardData?.getData('text/plain')
            if (text?.includes('\n')) {
              view.dispatch(view.state.tr.insertText(text.replace(/\r?\n/g, ' ')))
              return true
            }
            return false
          },
        },
      }),
    ]
  },
})

interface RichTextEditorProps {
  value: string
  onChange: (md: string) => void
  placeholder?: string
  singleLine?: boolean
  ariaLabel?: string
  className?: string
}

const RichTextEditor = ({
  value,
  onChange,
  placeholder,
  singleLine,
  ariaLabel,
  className,
}: RichTextEditorProps) => {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const linkInputRef = useRef<InputRef>(null)

  useEffect(() => {
    if (linkOpen) linkInputRef.current?.focus()
  }, [linkOpen])

  const editor = useEditor({
    extensions: [
      singleLine ? SingleLineDoc : Document,
      Paragraph,
      Text,
      Bold,
      Italic,
      Link.extend({ inclusive: false }).configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      History,
      Placeholder.configure({ placeholder }),
      Markdown.configure({
        html: false,
        linkify: false,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      ...(singleLine ? [SingleLine] : []),
    ],
    content: value,
    onUpdate({ editor }) {
      const storage = editor.storage as unknown as Record<
        string,
        { getMarkdown: () => string }
      >
      onChange(storage.markdown.getMarkdown())
    },
    editorProps: {
      attributes: {
        class: clsx('outline-none px-[11px] py-1', !singleLine && 'min-h-[60px]'),
        'aria-label': ariaLabel ?? '',
        role: 'textbox',
      },
    },
  })

  const linkDisabled = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return true
      const hasSelection = !e.state.selection.empty
      return !hasSelection && !e.isActive('link')
    },
  })

  const openLinkPopover = useCallback(() => {
    if (!editor) return
    setLinkUrl(editor.getAttributes('link').href ?? '')
    setLinkOpen(true)
  }, [editor])

  const applyLink = useCallback(() => {
    if (!editor || !linkUrl.trim()) return
    let href = linkUrl.trim()
    if (!/^https?:\/\//i.test(href)) href = `https://${href}`
    const { to } = editor.state.selection
    editor.chain().focus().setLink({ href }).setTextSelection(to).run()
    setLinkOpen(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  const removeLink = useCallback(() => {
    if (!editor) return
    editor.chain().focus().unsetLink().run()
    setLinkOpen(false)
    setLinkUrl('')
  }, [editor])

  if (!editor) return null

  return (
    <div
      className={clsx(
        'rounded-sm border border-primary-300 bg-white transition-colors focus-within:border-primary-900',
        className,
      )}
    >
      <div className="flex items-center gap-0.5 border-b border-primary-200 px-1 py-0.5">
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Bold"
        >
          <BoldIcon size={14} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <ItalicIcon size={14} />
        </ToolbarButton>
        <Popover
          content={
            <div className="flex flex-col gap-2 w-64">
              <Input
                ref={linkInputRef}
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                onPressEnter={applyLink}
                aria-label="URL"
              />
              <div className="flex gap-2">
                <Button
                  size="small"
                  type="primary"
                  onClick={applyLink}
                  disabled={!linkUrl.trim()}
                >
                  Apply
                </Button>
                {editor.isActive('link') && (
                  <Button size="small" danger onClick={removeLink}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          }
          trigger="click"
          open={linkOpen}
          onOpenChange={(open) => {
            if (linkDisabled) return
            if (open) openLinkPopover()
            else setLinkOpen(false)
          }}
        >
          <ToolbarButton
            active={editor.isActive('link')}
            disabled={linkDisabled}
            label="Link"
          >
            <LinkIcon size={14} />
          </ToolbarButton>
        </Popover>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

const ToolbarButton = forwardRef<
  HTMLButtonElement,
  {
    active: boolean
    disabled?: boolean
    onClick?: () => void
    label: string
    children: React.ReactNode
  }
>(({ active, disabled, onClick, label, children }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={clsx(
      'flex items-center justify-center rounded-sm p-1 transition-colors',
      disabled
        ? 'text-primary-300 cursor-not-allowed'
        : active
          ? 'bg-primary-200 text-primary-900'
          : 'text-primary-500 hover:bg-primary-100 hover:text-primary-900',
    )}
    aria-label={label}
    aria-pressed={active}
  >
    {children}
  </button>
))
ToolbarButton.displayName = 'ToolbarButton'

export default RichTextEditor
