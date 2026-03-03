import { useEffect, useMemo, useRef } from 'react';
import Quill from 'quill';

function normalizeHtml(value) {
  if (!value || value === '<p><br></p>') {
    return '';
  }
  return value;
}

const toolbarOptions = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'blockquote', 'code-block'],
  ['clean'],
];

export default function RichTextComposer({ value, onChange, placeholder = 'Escreva aqui...' }) {
  const hostRef = useRef(null);
  const quillRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const lastValueRef = useRef(normalizeHtml(value));

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const modules = useMemo(
    () => ({
      toolbar: toolbarOptions,
    }),
    [],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host || quillRef.current) {
      return;
    }

    host.innerHTML = '';
    const editorElement = document.createElement('div');
    host.appendChild(editorElement);

    const quill = new Quill(editorElement, {
      theme: 'snow',
      placeholder,
      modules,
    });

    quill.root.innerHTML = lastValueRef.current;

    const handleTextChange = () => {
      const html = normalizeHtml(quill.root.innerHTML);
      lastValueRef.current = html;
      onChangeRef.current(html);
    };

    quill.on('text-change', handleTextChange);
    quillRef.current = quill;

    return () => {
      quill.off('text-change', handleTextChange);
      quillRef.current = null;
      host.innerHTML = '';
    };
  }, [modules, placeholder]);

  useEffect(() => {
    const normalized = normalizeHtml(value);
    if (!quillRef.current || normalized === lastValueRef.current) {
      return;
    }

    const selection = quillRef.current.getSelection();
    quillRef.current.root.innerHTML = normalized;
    if (selection) {
      quillRef.current.setSelection(selection.index, selection.length);
    }
    lastValueRef.current = normalized;
  }, [value]);

  return (
    <div className="rounded-lg border border-light-gray bg-white">
      <div ref={hostRef} className="min-h-[220px]" />
    </div>
  );
}
