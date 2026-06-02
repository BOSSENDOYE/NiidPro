import { useEffect, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Box, IconButton, Divider, Tooltip } from '@mui/material';
import {
  FormatBold, FormatItalic, FormatUnderlined, FormatStrikethrough,
  FormatAlignLeft, FormatAlignCenter, FormatAlignRight, FormatAlignJustify,
  FormatListBulleted, FormatListNumbered, FormatQuote, FormatClear,
} from '@mui/icons-material';

export interface RichTextEditorHandle {
  insertContent: (text: string) => void;
}

interface Props {
  value:        string;
  onChange:     (html: string) => void;
  accentColor?: string;
  minHeight?:   number;
  error?:       boolean;
}

const RichTextEditor = forwardRef<RichTextEditorHandle, Props>(
  ({ value, onChange, accentColor = '#2563EB', minHeight = 280, error }, ref) => {

    const editor = useEditor({
      extensions: [
        StarterKit,
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ],
      content: value || '',
      onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    });

    useEffect(() => {
      if (editor && !editor.isDestroyed) {
        const current = editor.getHTML();
        if (value !== current) {
          editor.commands.setContent(value || '', false);
        }
      }
    }, [value, editor]);

    useImperativeHandle(ref, () => ({
      insertContent: (text) => {
        editor?.chain().focus().insertContent(text).run();
      },
    }));

    const ToolBtn = ({
      active, title, onClick, children,
    }: { active: boolean; title: string; onClick: () => void; children: React.ReactNode }) => (
      <Tooltip title={title}>
        <IconButton size="small" onClick={onClick}
          sx={{
            borderRadius: '6px', width: 28, height: 28,
            bgcolor:  active ? accentColor : 'transparent',
            color:    active ? '#fff' : '#475569',
            '&:hover': { bgcolor: active ? accentColor : '#F1F5F9' },
            transition: 'all 0.12s',
          }}>
          {children}
        </IconButton>
      </Tooltip>
    );

    const H = ({ level, label }: { level: 1 | 2; label: string }) => (
      <ToolBtn
        active={editor?.isActive('heading', { level }) ?? false}
        title={`Titre ${level}`}
        onClick={() => editor?.chain().focus().toggleHeading({ level }).run()}
      >
        <Box sx={{ fontSize: 11, fontWeight: 800, lineHeight: 1, width: 18, height: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {label}
        </Box>
      </ToolBtn>
    );

    if (!editor) return null;

    return (
      <Box sx={{
        border: `1.5px solid ${error ? '#EF4444' : '#E2E8F0'}`,
        borderRadius: '10px',
        overflow: 'hidden',
        bgcolor: '#FAFAFA',
        '&:focus-within': {
          borderColor: accentColor,
          boxShadow: `0 0 0 3px ${accentColor}18`,
        },
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>

        {/* ── Toolbar ── */}
        <Box sx={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.25,
          px: 1, py: 0.625,
          bgcolor: '#F8FAFC',
          borderBottom: '1px solid #E8EDF2',
        }}>
          {/* Formatage de base */}
          <ToolBtn active={editor.isActive('bold')}      title="Gras (Ctrl+B)"       onClick={() => editor.chain().focus().toggleBold().run()}>
            <FormatBold sx={{ fontSize: 18 }} />
          </ToolBtn>
          <ToolBtn active={editor.isActive('italic')}    title="Italique (Ctrl+I)"    onClick={() => editor.chain().focus().toggleItalic().run()}>
            <FormatItalic sx={{ fontSize: 18 }} />
          </ToolBtn>
          <ToolBtn active={editor.isActive('underline')} title="Souligné (Ctrl+U)"   onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <FormatUnderlined sx={{ fontSize: 18 }} />
          </ToolBtn>
          <ToolBtn active={editor.isActive('strike')}    title="Barré"                onClick={() => editor.chain().focus().toggleStrike().run()}>
            <FormatStrikethrough sx={{ fontSize: 18 }} />
          </ToolBtn>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* Titres */}
          <H level={1} label="H1" />
          <H level={2} label="H2" />

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* Alignement */}
          <ToolBtn active={editor.isActive({ textAlign: 'left' })}    title="Aligner à gauche"  onClick={() => editor.chain().focus().setTextAlign('left').run()}>
            <FormatAlignLeft sx={{ fontSize: 18 }} />
          </ToolBtn>
          <ToolBtn active={editor.isActive({ textAlign: 'center' })}  title="Centrer"            onClick={() => editor.chain().focus().setTextAlign('center').run()}>
            <FormatAlignCenter sx={{ fontSize: 18 }} />
          </ToolBtn>
          <ToolBtn active={editor.isActive({ textAlign: 'right' })}   title="Aligner à droite"  onClick={() => editor.chain().focus().setTextAlign('right').run()}>
            <FormatAlignRight sx={{ fontSize: 18 }} />
          </ToolBtn>
          <ToolBtn active={editor.isActive({ textAlign: 'justify' })} title="Justifier"          onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
            <FormatAlignJustify sx={{ fontSize: 18 }} />
          </ToolBtn>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* Listes */}
          <ToolBtn active={editor.isActive('bulletList')}  title="Liste à puces"   onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <FormatListBulleted sx={{ fontSize: 18 }} />
          </ToolBtn>
          <ToolBtn active={editor.isActive('orderedList')} title="Liste numérotée" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <FormatListNumbered sx={{ fontSize: 18 }} />
          </ToolBtn>
          <ToolBtn active={editor.isActive('blockquote')}  title="Citation"        onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <FormatQuote sx={{ fontSize: 18 }} />
          </ToolBtn>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* Effacer */}
          <Tooltip title="Effacer la mise en forme">
            <IconButton size="small" onClick={() => editor.chain().focus().unsetAllMarks().run()}
              sx={{ borderRadius: '6px', width: 28, height: 28, color: '#94A3B8',
                '&:hover': { bgcolor: '#FEE2E2', color: '#EF4444' } }}>
              <FormatClear sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* ── Contenu ── */}
        <Box sx={{
          '& .ProseMirror': {
            outline: 'none',
            padding: '12px 16px',
            minHeight,
            fontSize: 13,
            lineHeight: 1.85,
            color: '#1E293B',
            fontFamily: 'inherit',
            cursor: 'text',
          },
          '& .ProseMirror p': { margin: '0 0 6px 0' },
          '& .ProseMirror p:last-child': { marginBottom: 0 },
          '& .ProseMirror h1': { fontSize: 18, fontWeight: 700, margin: '14px 0 6px', color: '#0F172A' },
          '& .ProseMirror h2': { fontSize: 15, fontWeight: 700, margin: '10px 0 4px', color: '#0F172A' },
          '& .ProseMirror ul, & .ProseMirror ol': { paddingLeft: 28, margin: '4px 0 8px' },
          '& .ProseMirror li': { margin: '2px 0' },
          '& .ProseMirror blockquote': {
            borderLeft: '3px solid #CBD5E1', paddingLeft: 14, margin: '8px 0',
            color: '#64748B', fontStyle: 'italic',
          },
          '& .ProseMirror strong': { fontWeight: 700 },
          '& .ProseMirror em':     { fontStyle: 'italic' },
          '& .ProseMirror u':      { textDecoration: 'underline' },
          '& .ProseMirror s':      { textDecoration: 'line-through' },
          '& .ProseMirror.is-editor-empty p:first-of-type::before': {
            content: '"Saisissez le contenu du modèle ici…"',
            color: '#94A3B8', pointerEvents: 'none', float: 'left', height: 0,
          },
        }}>
          <EditorContent editor={editor} />
        </Box>
      </Box>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
