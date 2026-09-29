import ReactSelect, { type StylesConfig } from "react-select"

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

const SELECT_STYLES: StylesConfig<FilterSelectOption, true> = {
  // The menu is portalled to the body because the invoice table below has sticky headers of its own -
  // an inline menu paints underneath them and the last options become unreadable.
  menuPortal: (base) => ({ ...base, zIndex: 1400 }),
  control: (base) => ({ ...base, minHeight: 44 }),
  multiValueRemove: (base) => ({ ...base, minWidth: 44, minHeight: 44, justifyContent: "center", cursor: "pointer" }),
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
      styles={SELECT_STYLES}
    />
  )
}
