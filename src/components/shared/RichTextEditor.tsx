import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Link, Undo, Redo,
  Heading1, Heading2, Heading3, Palette, Type,
  Minus, Code, Eye, EyeOff
} from 'lucide-react';
import clsx from 'clsx';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  label?: string;
  className?: string;
}

const COLORS = [
  '#111827', '#374151', '#6b7280',
  '#ef4444', '#f97316', '#f59e0b',
  '#10b981', '#3b82f6', '#6366f1',
  '#8b5cf6', '#ec4899', '#14b8a6',
];

const FONT_SIZES = ['12', '14', '16', '18', '20', '24', '28', '32'];

type ToolBtn = {
  icon: React.ReactNode;
  title: string;
  action: () => void;
  active?: boolean;
  type?: 'separator';
};

export default function RichTextEditor({ value, onChange, placeholder = 'Start writing…', minHeight = 160, label, className }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  const exec = useCallback((cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
    updateActiveFormats();
  }, []);

  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    if (document.queryCommandState('bold'))          formats.add('bold');
    if (document.queryCommandState('italic'))        formats.add('italic');
    if (document.queryCommandState('underline'))     formats.add('underline');
    if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough');
    if (document.queryCommandState('insertOrderedList'))   formats.add('ol');
    if (document.queryCommandState('insertUnorderedList')) formats.add('ul');
    if (document.queryCommandState('justifyCenter')) formats.add('center');
    if (document.queryCommandState('justifyRight'))  formats.add('right');
    if (document.queryCommandState('justifyFull'))   formats.add('justify');
    setActiveFormats(formats);
  }, []);

  // Set initial content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, []);

  const handleInput = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? '';
    onChange(html === '<br>' || html === '<p><br></p>' ? '' : html);
    updateActiveFormats();
  }, [onChange, updateActiveFormats]);

  const insertLink = () => {
    const url = prompt('Enter URL:', 'https://');
    if (url) exec('createLink', url);
  };

  const insertHeading = (level: 1|2|3) => {
    exec('formatBlock', `h${level}`);
  };

  const insertBlockquote = () => exec('formatBlock', 'blockquote');
  const insertCode = () => exec('formatBlock', 'pre');
  const insertHr = () => exec('insertHorizontalRule');

  const isActive = (f: string) => activeFormats.has(f);

  // Toolbar button helper
  const Btn = ({ icon, title, action, active }: { icon: React.ReactNode; title: string; action: () => void; active?: boolean }) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); action(); }}
      className={clsx(
        'w-8 h-8 rounded-lg flex items-center justify-center transition-all text-sm flex-shrink-0',
        active
          ? 'bg-[var(--org-primary)] text-white shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}>
      {icon}
    </button>
  );

  const Sep = () => <div className="w-px h-5 bg-gray-200 mx-0.5 flex-shrink-0" />;

  return (
    <div className={clsx('space-y-1', className)}>
      {label && (
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
          {label}
        </label>
      )}

      <div className="border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-[var(--org-primary)] transition-colors shadow-sm">
        {/* ─── Toolbar ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-gray-50 border-b border-gray-200">
          {/* History */}
          <Btn icon={<Undo className="w-3.5 h-3.5"/>} title="Undo (Ctrl+Z)" action={() => exec('undo')} />
          <Btn icon={<Redo className="w-3.5 h-3.5"/>} title="Redo (Ctrl+Y)" action={() => exec('redo')} />
          <Sep />

          {/* Headings */}
          <Btn icon={<Heading1 className="w-3.5 h-3.5"/>} title="Heading 1" action={() => insertHeading(1)} />
          <Btn icon={<Heading2 className="w-3.5 h-3.5"/>} title="Heading 2" action={() => insertHeading(2)} />
          <Btn icon={<Heading3 className="w-3.5 h-3.5"/>} title="Heading 3" action={() => insertHeading(3)} />
          <Sep />

          {/* Text formatting */}
          <Btn icon={<Bold className="w-3.5 h-3.5"/>}          title="Bold (Ctrl+B)"      action={() => exec('bold')}          active={isActive('bold')} />
          <Btn icon={<Italic className="w-3.5 h-3.5"/>}        title="Italic (Ctrl+I)"    action={() => exec('italic')}        active={isActive('italic')} />
          <Btn icon={<Underline className="w-3.5 h-3.5"/>}     title="Underline (Ctrl+U)" action={() => exec('underline')}     active={isActive('underline')} />
          <Btn icon={<Strikethrough className="w-3.5 h-3.5"/>} title="Strikethrough"      action={() => exec('strikeThrough')} active={isActive('strikeThrough')} />
          <Sep />

          {/* Alignment */}
          <Btn icon={<AlignLeft className="w-3.5 h-3.5"/>}    title="Align Left"    action={() => exec('justifyLeft')}    active={!isActive('center')&&!isActive('right')&&!isActive('justify')} />
          <Btn icon={<AlignCenter className="w-3.5 h-3.5"/>}  title="Align Center"  action={() => exec('justifyCenter')}  active={isActive('center')} />
          <Btn icon={<AlignRight className="w-3.5 h-3.5"/>}   title="Align Right"   action={() => exec('justifyRight')}   active={isActive('right')} />
          <Btn icon={<AlignJustify className="w-3.5 h-3.5"/>} title="Justify"       action={() => exec('justifyFull')}    active={isActive('justify')} />
          <Sep />

          {/* Lists */}
          <Btn icon={<List className="w-3.5 h-3.5"/>}        title="Bullet List"   action={() => exec('insertUnorderedList')} active={isActive('ul')} />
          <Btn icon={<ListOrdered className="w-3.5 h-3.5"/>} title="Numbered List" action={() => exec('insertOrderedList')}   active={isActive('ol')} />
          <Btn icon={<Quote className="w-3.5 h-3.5"/>}       title="Blockquote"    action={insertBlockquote} />
          <Sep />

          {/* Extras */}
          <Btn icon={<Link className="w-3.5 h-3.5"/>}  title="Insert Link"      action={insertLink} />
          <Btn icon={<Code className="w-3.5 h-3.5"/>}  title="Code Block"       action={insertCode} />
          <Btn icon={<Minus className="w-3.5 h-3.5"/>} title="Horizontal Rule"  action={insertHr} />
          <Sep />

          {/* Font size */}
          <div className="relative">
            <button
              type="button"
              title="Font Size"
              onMouseDown={e => { e.preventDefault(); setShowFontSize(!showFontSize); setShowColorPicker(false); }}
              className="flex items-center gap-1 h-8 px-2 rounded-lg text-gray-600 hover:bg-gray-100 text-xs font-semibold transition-colors">
              <Type className="w-3.5 h-3.5" />
              <span>Size</span>
            </button>
            {showFontSize && (
              <div className="absolute top-9 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-xl p-1.5 grid grid-cols-4 gap-0.5 w-36">
                {FONT_SIZES.map(sz => (
                  <button key={sz} type="button"
                    onMouseDown={e => { e.preventDefault(); exec('fontSize', '3'); setTimeout(() => { const sel = window.getSelection(); if (sel && sel.rangeCount) { const span = document.createElement('span'); span.style.fontSize = `${sz}px`; sel.getRangeAt(0).surroundContents(span); } }); setShowFontSize(false); }}
                    className="px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-100 text-gray-700">
                    {sz}px
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Color picker */}
          <div className="relative">
            <button
              type="button"
              title="Text Color"
              onMouseDown={e => { e.preventDefault(); setShowColorPicker(!showColorPicker); setShowFontSize(false); }}
              className="flex items-center gap-1 h-8 px-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
              <Palette className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Color</span>
            </button>
            {showColorPicker && (
              <div className="absolute top-9 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-xl p-2 grid grid-cols-6 gap-1 w-40">
                {COLORS.map(color => (
                  <button key={color} type="button"
                    onMouseDown={e => { e.preventDefault(); exec('foreColor', color); setShowColorPicker(false); }}
                    className="w-6 h-6 rounded-full border-2 border-white hover:scale-125 transition-all shadow-sm flex-shrink-0"
                    style={{ background: color }} title={color} />
                ))}
              </div>
            )}
          </div>

          <Sep />

          {/* Preview toggle */}
          <button
            type="button"
            title={showPreview ? 'Edit' : 'Preview'}
            onMouseDown={e => { e.preventDefault(); setShowPreview(!showPreview); }}
            className={clsx('flex items-center gap-1 h-8 px-2 rounded-lg text-xs font-semibold transition-all',
              showPreview ? 'bg-[var(--org-primary)] text-white' : 'text-gray-600 hover:bg-gray-100')}>
            {showPreview ? <EyeOff className="w-3.5 h-3.5"/> : <Eye className="w-3.5 h-3.5"/>}
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>

        {/* ─── Preview mode ─────────────────────────────────── */}
        {showPreview ? (
          <div
            className="px-4 py-3 prose prose-sm max-w-none bg-white"
            style={{ minHeight }}
            dangerouslySetInnerHTML={{ __html: value || `<p class="text-gray-400">${placeholder}</p>` }}
          />
        ) : (
          /* ─── Edit mode ──────────────────────────────────── */
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats}
            onSelect={updateActiveFormats}
            data-placeholder={placeholder}
            className="rich-editor px-4 py-3 outline-none bg-white text-gray-800 text-sm leading-relaxed"
            style={{ minHeight }}
          />
        )}

        {/* ─── Footer: word count ───────────────────────────── */}
        <div className="px-4 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {(value.replace(/<[^>]*>/g,'').trim().split(/\s+/).filter(Boolean).length)} words
          </span>
          <span className="text-xs text-gray-400">HTML editor</span>
        </div>
      </div>

      {/* Editor styles */}
      <style>{`
        .rich-editor:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .rich-editor h1 { font-size: 1.75rem; font-weight: 900; color: #111; margin: 1rem 0 0.5rem; line-height: 1.2; }
        .rich-editor h2 { font-size: 1.375rem; font-weight: 800; color: #111; margin: 0.875rem 0 0.5rem; }
        .rich-editor h3 { font-size: 1.125rem; font-weight: 700; color: #374151; margin: 0.75rem 0 0.375rem; }
        .rich-editor p  { margin: 0.5rem 0; }
        .rich-editor ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .rich-editor ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .rich-editor li { margin: 0.25rem 0; }
        .rich-editor blockquote { border-left: 4px solid var(--org-primary, #f97316); padding: 0.5rem 1rem; background: #fef9f0; border-radius: 0 0.5rem 0.5rem 0; margin: 0.75rem 0; color: #92400e; font-style: italic; }
        .rich-editor pre { background: #1f2937; color: #34d399; padding: 1rem; border-radius: 0.75rem; font-family: monospace; font-size: 0.8125rem; overflow-x: auto; margin: 0.75rem 0; }
        .rich-editor a  { color: var(--org-primary, #f97316); text-decoration: underline; }
        .rich-editor hr { border: none; border-top: 2px dashed #e5e7eb; margin: 1rem 0; }
        .rich-editor b, .rich-editor strong { font-weight: 700; }
        .rich-editor i, .rich-editor em { font-style: italic; }
        .rich-editor u { text-decoration: underline; }
        .rich-editor s { text-decoration: line-through; }
      `}</style>
    </div>
  );
}
