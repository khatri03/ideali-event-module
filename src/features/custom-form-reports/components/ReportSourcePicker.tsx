import { Box, Field, SimpleGrid } from "@chakra-ui/react"
import { StyledSelect, type SelectOption } from "@/components/common"
import { NO_TEMPLATE_VALUE } from "../constants"
import type { ReportModuleOption, ReportOption } from "@/api/customFormReports"

interface ReportSourcePickerProps {
  modules: ReportModuleOption[]
  entities: ReportOption[]
  forms: ReportOption[]
  templates: ReportOption[]
  moduleId: number | null
  entityUniqueId: string | null
  formUniqueId: string | null
  templateUniqueId: string | null
  isLoadingModules: boolean
  isLoadingEntities: boolean
  isLoadingForms: boolean
  isLoadingTemplates: boolean
  onModuleChange: (moduleId: number) => void
  onEntityChange: (entityUniqueId: string) => void
  onFormChange: (formUniqueId: string) => void
  onTemplateChange: (templateUniqueId: string | null) => void
}

function toOptions(items: ReportOption[]): SelectOption[] {
  return items.map((item) => ({ label: item.name, value: item.uniqueId }))
}

export function ReportSourcePicker({
  modules,
  entities,
  forms,
  templates,
  moduleId,
  entityUniqueId,
  formUniqueId,
  templateUniqueId,
  isLoadingModules,
  isLoadingEntities,
  isLoadingForms,
  isLoadingTemplates,
  onModuleChange,
  onEntityChange,
  onFormChange,
  onTemplateChange,
}: ReportSourcePickerProps) {
  const templateOptions: SelectOption[] = [
    { label: "No template", value: NO_TEMPLATE_VALUE },
    ...toOptions(templates),
  ]

  return (
    <Box
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="20px"
      bg="card.bg"
      boxShadow="card"
      p={{ base: 4, md: 5 }}
    >
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={4}>
        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="700">
            Module
          </Field.Label>
          <StyledSelect
            size="sm"
            options={modules.map((module) => ({ label: module.name, value: String(module.id) }))}
            value={moduleId === null ? "" : String(moduleId)}
            onChange={(value) => onModuleChange(Number(value))}
            placeholder={isLoadingModules ? "Loading modules..." : "Select a module"}
            disabled={isLoadingModules || modules.length === 0}
          />
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="700">
            Entity
          </Field.Label>
          <StyledSelect
            size="sm"
            options={toOptions(entities)}
            value={entityUniqueId ?? ""}
            onChange={onEntityChange}
            placeholder={isLoadingEntities ? "Loading entities..." : "Select an entity"}
            disabled={moduleId === null || isLoadingEntities || entities.length === 0}
          />
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="700">
            Custom form
          </Field.Label>
          <StyledSelect
            size="sm"
            options={toOptions(forms)}
            value={formUniqueId ?? ""}
            onChange={onFormChange}
            placeholder={isLoadingForms ? "Loading forms..." : "Select a custom form"}
            disabled={entityUniqueId === null || isLoadingForms || forms.length === 0}
          />
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="700">
            Saved template
          </Field.Label>
          <StyledSelect
            size="sm"
            options={templateOptions}
            value={templateUniqueId ?? NO_TEMPLATE_VALUE}
            onChange={(value) => onTemplateChange(value === NO_TEMPLATE_VALUE ? null : value)}
            placeholder={isLoadingTemplates ? "Loading templates..." : "No template"}
            disabled={formUniqueId === null || isLoadingTemplates}
          />
        </Field.Root>
      </SimpleGrid>
    </Box>
  )
}
