import { cn } from '@/lib/utils'

const fieldClass =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink shadow-xs transition-colors placeholder:text-ink-muted/70 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20'

export function Label({
  children,
  htmlFor,
  required,
}: {
  children: React.ReactNode
  htmlFor: string
  required?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
      {children}
      {required && <span className="text-coral"> *</span>}
    </label>
  )
}

export function Field({
  label,
  name,
  type = 'text',
  required,
  placeholder,
  autoComplete,
  defaultValue,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
  autoComplete?: string
  defaultValue?: string
}) {
  return (
    <div>
      <Label htmlFor={name} required={required}>
        {label}
      </Label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className={fieldClass}
      />
    </div>
  )
}

export function Select({
  label,
  name,
  options,
  required,
}: {
  label: string
  name: string
  options: string[]
  required?: boolean
}) {
  return (
    <div>
      <Label htmlFor={name} required={required}>
        {label}
      </Label>
      <select id={name} name={name} required={required} defaultValue="" className={fieldClass}>
        <option value="" disabled>
          Choose one…
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

export function TextArea({
  label,
  name,
  placeholder,
  rows = 4,
  required,
}: {
  label: string
  name: string
  placeholder?: string
  rows?: number
  required?: boolean
}) {
  return (
    <div>
      <Label htmlFor={name} required={required}>
        {label}
      </Label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
        className={cn(fieldClass, 'resize-y')}
      />
    </div>
  )
}
