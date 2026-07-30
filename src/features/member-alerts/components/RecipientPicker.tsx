import { useCallback } from "react"
import AsyncSelect from "react-select/async"
import type { MultiValue } from "react-select"
import { fetchAlertRecipientOptions, type AlertRecipientOption } from "@/api/alerts"

interface RecipientSelectOption {
  value: string
  label: string
  email: string | null
}

interface RecipientPickerProps {
  value: AlertRecipientOption[]
  onChange: (recipients: AlertRecipientOption[]) => void
}

function toOption(recipient: AlertRecipientOption): RecipientSelectOption {
  return {
    value: recipient.uniqueId,
    label: recipient.email ? `${recipient.name} (${recipient.email})` : recipient.name,
    email: recipient.email,
  }
}

export function RecipientPicker({ value, onChange }: RecipientPickerProps) {
  // Backend enforces the three-character minimum and returns an empty page below it, so the input just
  // forwards whatever was typed. Debounced by react-select's own async handling.
  const loadOptions = useCallback(async (input: string): Promise<RecipientSelectOption[]> => {
    if (input.trim().length < 3) {
      return []
    }
    const options = await fetchAlertRecipientOptions(input)
    return options.map(toOption)
  }, [])

  const selected = value.map(toOption)

  function handleChange(next: MultiValue<RecipientSelectOption>) {
    onChange(
      next.map((option) => ({
        uniqueId: option.value,
        name: option.label.replace(/\s*\(.*\)$/, ""),
        email: option.email,
      })),
    )
  }

  return (
    <AsyncSelect
      isMulti
      cacheOptions
      defaultOptions={false}
      value={selected}
      loadOptions={loadOptions}
      onChange={handleChange}
      placeholder="Type at least 3 characters to search by name or email"
      noOptionsMessage={({ inputValue }) =>
        inputValue.trim().length < 3 ? "Type at least 3 characters" : "No matches"
      }
      closeMenuOnSelect={false}
      aria-label="Recipients"
    />
  )
}
