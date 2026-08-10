import ReactSelect from "react-select"

export interface FilterSelectOption {
  value: string
  label: string
}

interface FilterMultiSelectProps {
  options: readonly FilterSelectOption[]
  selectedValues: string[]
  placeholder: string
  isLoading?: boolean
  onChange: (values: string[]) => void
}

/**
 * The menu is portalled to the body because the invoice table below has sticky headers of its own -
 * an inline menu paints underneath them and the last options become unreadable.
 */
const MENU_ABOVE_STICKY_HEADERS = {
  menuPortal: (base: Record<string, unknown>) => ({ ...base, zIndex: 1400 }),
}

export function FilterMultiSelect({
  options,
  selectedValues,
  placeholder,
  isLoading = false,
  onChange,
}: FilterMultiSelectProps) {
  const selected = options.filter((option) => selectedValues.includes(option.value))

  return (
    <ReactSelect
      isMulti
      options={options as FilterSelectOption[]}
      value={selected}
      onChange={(values) => onChange(values.map((option) => option.value))}
      placeholder={placeholder}
      isLoading={isLoading}
      closeMenuOnSelect={false}
      isClearable
      menuPortalTarget={typeof document === "undefined" ? undefined : document.body}
      menuPosition="fixed"
      styles={MENU_ABOVE_STICKY_HEADERS}
    />
  )
}
