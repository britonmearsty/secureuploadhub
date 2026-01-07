"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Highlighter
} from 'lucide-react'
import { useCallback, useState } from 'react'

interface TiptapEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  className?: string
}

export default function TiptapEditor({ 
  content = '', 
  onChange, 
  placeholder = 'Start writing your article...',
  className = ''
}: TiptapEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Color,
      TextStyle,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:')
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const addLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href
    const url = window.prompt('Enter URL:', previousUrl)
    
    if (url === null) return
    
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const colors = [
    '#000000', '#374151', '#6B7280', '#9CA3AF',
    '#EF4444', '#F97316', '#EAB308', '#22C55E',
    '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E'
  ]

  const highlightColors = [
    '#FEF3C7', '#DBEAFE', '#D1FAE5', '#FCE7F3',
    '#FEE2E2', '#FED7AA', '#E0E7FF', '#F3E8FF'
  ]

  if (!editor) {
    return <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
  }

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-300 p-2 flex flex-wrap gap-1 bg-gray-50">
        {/* Text formatting */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('bold') ? 'bg-gray-300' : ''
          }`}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('italic') ? 'bg-gray-300' : ''
          }`}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('strike') ? 'bg-gray-300' : ''
          }`}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('code') ? 'bg-gray-300' : ''
          }`}
          title="Code"
        >
          <Code size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Headings */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''
          }`}
          title="Heading 1"
        >
          <Heading1 size={16} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''
          }`}
          title="Heading 2"
        >
          <Heading2 size={16} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('heading', { level: 3 }) ? 'bg-gray-300' : ''
          }`}
          title="Heading 3"
        >
          <Heading3 size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Lists */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('bulletList') ? 'bg-gray-300' : ''
          }`}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('orderedList') ? 'bg-gray-300' : ''
          }`}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('blockquote') ? 'bg-gray-300' : ''
          }`}
          title="Quote"
        >
          <Quote size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Alignment */}
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : ''
          }`}
          title="Align Left"
        >
          <AlignLeft size={16} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : ''
          }`}
          title="Align Center"
        >
          <AlignCenter size={16} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : ''
          }`}
          title="Align Right"
        >
          <AlignRight size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Color and Highlight */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 rounded hover:bg-gray-200"
            title="Text Color"
          >
            <Palette size={16} />
          </button>
          {showColorPicker && (
            <div className="absolute top-10 left-0 bg-white border border-gray-300 rounded-lg p-2 shadow-lg z-10">
              <div className="grid grid-cols-4 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run()
                      setShowColorPicker(false)
                    }}
                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowHighlightPicker(!showHighlightPicker)}
            className="p-2 rounded hover:bg-gray-200"
            title="Highlight"
          >
            <Highlighter size={16} />
          </button>
          {showHighlightPicker && (
            <div className="absolute top-10 left-0 bg-white border border-gray-300 rounded-lg p-2 shadow-lg z-10">
              <div className="grid grid-cols-4 gap-1">
                {highlightColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      editor.chain().focus().setHighlight({ color }).run()
                      setShowHighlightPicker(false)
                    }}
                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Media */}
        <button
          onClick={addLink}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('link') ? 'bg-gray-300' : ''
          }`}
          title="Add Link"
        >
          <LinkIcon size={16} />
        </button>
        
        <button
          onClick={addImage}
          className="p-2 rounded hover:bg-gray-200"
          title="Add Image"
        >
          <ImageIcon size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Undo/Redo */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo"
        >
          <Undo size={16} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo"
        >
          <Redo size={16} />
        </button>
      </div>

      {/* Editor */}
      <EditorContent 
        editor={editor} 
        className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none p-4 min-h-[300px] focus:outline-none"
      />
    </div>
  )
}