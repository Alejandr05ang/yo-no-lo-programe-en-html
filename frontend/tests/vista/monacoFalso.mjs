// Sustituto de @monaco-editor/react para jsdom: un <textarea> con la misma interfaz que usa
// EditorPanel (value, path, onChange, options.readOnly). Lo que se prueba es lo que hace la
// app con los cambios del editor, no Monaco.
import { createElement } from 'react'

export default function Editor(props) {
  return createElement('textarea', {
    'data-editor': props.path,
    value: props.value ?? '',
    readOnly: !!props.options?.readOnly,
    onChange: (e) => props.onChange?.(e.target.value),
  })
}

export const loader = { config() {}, init: async () => ({}) }
