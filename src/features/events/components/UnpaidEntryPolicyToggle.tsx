import { WizardSettingToggle } from "./WizardSettingToggle"

interface UnpaidEntryPolicyToggleProps {
  isEnabled: boolean
  onToggle: (isEnabled: boolean) => void
}

export function UnpaidEntryPolicyToggle({ isEnabled, onToggle }: UnpaidEntryPolicyToggleProps) {
  return (
    <WizardSettingToggle
      label="Entry while payment is outstanding"
      title="Refuse entry until the order is paid"
      description={
        isEnabled
          ? "A ticket whose order still owes money is refused at the door, and the amount is named to the operator."
          : "The door is told what is owed, and whoever is scanning decides whether to admit the guest."
      }
      helperText="Applies to every session. Tickets bought on an unbanked cheque or a part payment are the ones this stops."
      switchLabel="Refuse entry until the order is paid"
      isEnabled={isEnabled}
      onToggle={onToggle}
    />
  )
}
