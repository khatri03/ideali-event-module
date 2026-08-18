import { WizardSettingToggle } from "./WizardSettingToggle"

interface PaymentMethodChargesToggleProps {
  isEnabled: boolean
  onToggle: (isEnabled: boolean) => void
}

export function PaymentMethodChargesToggle({ isEnabled, onToggle }: PaymentMethodChargesToggleProps) {
  return (
    <WizardSettingToggle
      label="Payment method charges"
      title="Pass the processing fee to the buyer"
      description={
        isEnabled
          ? "The fee for the method the buyer picks is added to their total."
          : "You absorb the fee and the buyer pays the ticket price."
      }
      helperText="Processing fees differ per payment method, so turning this on makes each method total differently."
      switchLabel="Pass payment method charges to the buyer"
      isEnabled={isEnabled}
      onToggle={onToggle}
    />
  )
}
