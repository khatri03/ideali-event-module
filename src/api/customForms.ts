import { z } from "zod"
import { client } from "@/api/client"
import { API_ROUTES } from "@/utils/routes"

const serviceResponseSchema = z
  .object({
    success: z.boolean().optional(),
    message: z.string().nullable().optional(),
    errorCode: z.string().nullable().optional(),
    validationErrors: z.record(z.string(), z.array(z.string())).nullable().optional(),
    meta: z.record(z.string(), z.unknown()).nullable().optional(),
    timestamp: z.string().optional(),
    Data: z.unknown().optional(),
    data: z.unknown().optional(),
  })
  .passthrough()

function readResponseData(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return payload
  }

  if ("Data" in payload) {
    return (payload as { Data?: unknown }).Data
  }

  if ("data" in payload) {
    return (payload as { data?: unknown }).data
  }

  return payload
}

function parseServicePayload(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload
  }

  const serviceResponse = serviceResponseSchema.parse(payload)
  return readResponseData(serviceResponse)
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function asOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function asString(value: unknown) {
  return typeof value === "string" ? value : ""
}

function splitAcceptValues(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return []
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function resolveAcceptedFileTypes(value: unknown, availableOptions: Array<{ value: string }>) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return []
  }

  if (availableOptions.length === 0) {
    return splitAcceptValues(value)
  }

  const selectedTokens = new Set(splitAcceptValues(value))

  return availableOptions
    .map((option) => option.value.trim())
    .filter((optionValue) => {
      if (!optionValue) {
        return false
      }

      const optionTokens = optionValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)

      return optionTokens.length > 0 && optionTokens.every((token) => selectedTokens.has(token))
    })
}

function normalizeFieldLayoutColumn(value: unknown) {
  const normalized = asOptionalNumber(value)
  return normalized === null ? null : Math.max(1, Math.min(4, normalized))
}

const customFormListItemSchema = z.object({
  Text: z.string().optional(),
  text: z.string().optional(),
  Value: z.string().optional(),
  value: z.string().optional(),
})

const customFormControlSchema = z.object({
  Id: z.number().int().optional(),
  id: z.number().int().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  ControlType: z.string().optional(),
  controlType: z.string().optional(),
  IconClass: z.string().optional(),
  iconClass: z.string().optional(),
  DefaultLabel: z.string().optional(),
  defaultLabel: z.string().optional(),
  CanBeRequired: z.boolean().optional(),
  canBeRequired: z.boolean().optional(),
  HasOptions: z.boolean().optional(),
  hasOptions: z.boolean().optional(),
  CanHavePlaceHolder: z.boolean().optional(),
  canHavePlaceHolder: z.boolean().optional(),
  CanHaveMinLength: z.boolean().optional(),
  canHaveMinLength: z.boolean().optional(),
  CanHaveMaxLength: z.boolean().optional(),
  canHaveMaxLength: z.boolean().optional(),
  AcceptedFileTypes: z.array(customFormListItemSchema).nullable().optional(),
  acceptedFileTypes: z.array(customFormListItemSchema).nullable().optional(),
})

export interface CustomFormListItem {
  text: string
  value: string
}

export interface CustomFormControl {
  id: number
  name: string
  controlType: string
  iconClass: string
  defaultLabel: string
  canBeRequired: boolean
  hasOptions: boolean
  canHavePlaceHolder: boolean
  canHaveMinLength: boolean
  canHaveMaxLength: boolean
  acceptedFileTypes: CustomFormListItem[]
}

export interface CustomFormPreviewOption {
  id: number
  value: string
  displayText: string
}

export interface CustomFormPreviewField {
  id: number
  uniqueId: string
  formId: number
  formControlTypeId: number
  controlUniqueId: string | null
  displayOrder: number
  layoutColumn: number | null
  controlLabel: string
  placeHolder: string | null
  tooltip: string | null
  isMandatory: boolean
  requiredMessage: string | null
  acceptedFileTypes: string[] | null
  minLength: string | null
  maxLength: string | null
  defaultValue: string | null
  options: CustomFormPreviewOption[]
  formControl: {
    id: number
    name: string
    canBeRequired: boolean
    canHaveMaxLength: boolean
    canHaveMinLength: boolean
    canHavePlaceHolder: boolean
    controlType: string
    defaultLabel: string
    hasOptions: boolean
    iconClass: string
    acceptedFileTypes: CustomFormListItem[]
  } | null
}

export interface CustomFormPreview {
  uniqueId: string
  name: string
  headerText: string
  description: string | null
  layoutColumn: number | null
  fields: CustomFormPreviewField[]
}

export async function fetchCustomFormListItems(): Promise<CustomFormListItem[]> {
  const res = await client.get<unknown>(API_ROUTES.organizerCustomFormListItems)
  const responseData = parseServicePayload(res.data)
  const listItems = z.array(customFormListItemSchema).parse(responseData)

  return listItems
    .map((item) => ({
      text: item.Text ?? item.text ?? "",
      value: item.Value ?? item.value ?? "",
    }))
    .filter((item) => item.text.length > 0 && item.value.length > 0)
}

export async function fetchCustomFormControls(): Promise<CustomFormControl[]> {
  const res = await client.get<unknown>(API_ROUTES.organizerCustomFormControls)
  const responseData = parseServicePayload(res.data)
  const controls = z.array(customFormControlSchema).parse(responseData)

  return controls
    .map((control) => ({
      id: control.Id ?? control.id ?? 0,
      name: control.Name ?? control.name ?? "",
      controlType: control.ControlType ?? control.controlType ?? "",
      iconClass: control.IconClass ?? control.iconClass ?? "",
      defaultLabel: control.DefaultLabel ?? control.defaultLabel ?? "",
      canBeRequired: control.CanBeRequired ?? control.canBeRequired ?? false,
      hasOptions: control.HasOptions ?? control.hasOptions ?? false,
      canHavePlaceHolder: control.CanHavePlaceHolder ?? control.canHavePlaceHolder ?? false,
      canHaveMinLength: control.CanHaveMinLength ?? control.canHaveMinLength ?? false,
      canHaveMaxLength: control.CanHaveMaxLength ?? control.canHaveMaxLength ?? false,
      acceptedFileTypes: (control.AcceptedFileTypes ?? control.acceptedFileTypes ?? []).map((item) => ({
        text: item.Text ?? item.text ?? "",
        value: item.Value ?? item.value ?? "",
      })),
    }))
    .filter((item) => item.id > 0 && item.name.length > 0)
}

export async function fetchCustomFormPreview(customFormUniqueId: string): Promise<CustomFormPreview> {
  const res = await client.get<unknown>(API_ROUTES.organizerCustomFormPreview(customFormUniqueId))
  const responseData = parseServicePayload(res.data)
  const preview = responseData as Record<string, unknown> | null

  if (!preview) {
    throw new Error("Unexpected custom form response.")
  }

  return {
    uniqueId: asString(preview.UniqueId ?? preview.uniqueId),
    name: asString(preview.Name ?? preview.name),
    headerText: asString(preview.HeaderText ?? preview.headerText),
    description: asString(preview.Description ?? preview.description) || null,
    layoutColumn: asOptionalNumber(preview.LayoutColumn ?? preview.layoutColumn),
    fields: Array.isArray(preview.Fields ?? preview.fields)
      ? ((preview.Fields ?? preview.fields) as unknown[]).map((field) => {
          const candidate = field as Record<string, unknown>
          const controlCandidate = (candidate.FormControl ?? candidate.formControl) as Record<string, unknown> | null
          const controlAcceptedFileTypes = Array.isArray(controlCandidate?.AcceptedFileTypes ?? controlCandidate?.acceptedFileTypes)
            ? ((controlCandidate?.AcceptedFileTypes ?? controlCandidate?.acceptedFileTypes) as unknown[])
                .map((item) => {
                  const acceptCandidate = item as Record<string, unknown>
                  return {
                    text: asString(acceptCandidate.Text ?? acceptCandidate.text),
                    value: asString(acceptCandidate.Value ?? acceptCandidate.value),
                  }
                })
                .filter((item) => item.text && item.value)
            : []

          const options = Array.isArray(candidate.Options ?? candidate.options)
            ? ((candidate.Options ?? candidate.options) as unknown[]).map((option) => {
                const optionCandidate = option as Record<string, unknown>
                return {
                  id: asNumber(optionCandidate.Id ?? optionCandidate.id),
                  value: asString(optionCandidate.Value ?? optionCandidate.value),
                  displayText: asString(optionCandidate.DisplayText ?? optionCandidate.displayText),
                }
              })
            : []

          return {
            id: asNumber(candidate.Id ?? candidate.id),
            uniqueId: asString(candidate.UniqueId ?? candidate.uniqueId),
            formId: asNumber(candidate.FormId ?? candidate.formId),
            formControlTypeId: asNumber(candidate.FormControlTypeId ?? candidate.formControlTypeId),
            controlUniqueId: asString(candidate.ControlUniqueId ?? candidate.controlUniqueId) || null,
            displayOrder: asNumber(candidate.DisplayOrder ?? candidate.displayOrder),
            layoutColumn: normalizeFieldLayoutColumn(candidate.LayoutColumn ?? candidate.layoutColumn),
            controlLabel: asString(candidate.ControlLabel ?? candidate.controlLabel),
            placeHolder: asString(candidate.PlaceHolder ?? candidate.placeHolder) || null,
            tooltip: asString(candidate.Tooltip ?? candidate.tooltip) || null,
            isMandatory: asBoolean(candidate.IsMandatory ?? candidate.isMandatory),
            requiredMessage: asString(candidate.RequiredMessage ?? candidate.requiredMessage) || null,
            acceptedFileTypes: resolveAcceptedFileTypes(
              candidate.AcceptedFileTypes ?? candidate.acceptedFileTypes,
              controlAcceptedFileTypes,
            ),
            minLength: asOptionalNumber(candidate.MinLength ?? candidate.minLength)?.toString() ?? null,
            maxLength: asOptionalNumber(candidate.MaxLength ?? candidate.maxLength)?.toString() ?? null,
            defaultValue: asString(candidate.DefaultValue ?? candidate.defaultValue) || null,
            options,
            formControl: controlCandidate
              ? {
                  id: asNumber(controlCandidate.Id ?? controlCandidate.id),
                  name: asString(controlCandidate.Name ?? controlCandidate.name),
                  canBeRequired: asBoolean(controlCandidate.CanBeRequired ?? controlCandidate.canBeRequired),
                  canHaveMaxLength: asBoolean(controlCandidate.CanHaveMaxLength ?? controlCandidate.canHaveMaxLength),
                  canHaveMinLength: asBoolean(controlCandidate.CanHaveMinLength ?? controlCandidate.canHaveMinLength),
                  canHavePlaceHolder: asBoolean(controlCandidate.CanHavePlaceHolder ?? controlCandidate.canHavePlaceHolder),
                  controlType: asString(controlCandidate.ControlType ?? controlCandidate.controlType),
                  defaultLabel: asString(controlCandidate.DefaultLabel ?? controlCandidate.defaultLabel),
                  hasOptions: asBoolean(controlCandidate.HasOptions ?? controlCandidate.hasOptions),
                  iconClass: asString(controlCandidate.IconClass ?? controlCandidate.iconClass),
                  acceptedFileTypes: controlAcceptedFileTypes,
                }
              : null,
          }
        })
      : [],
  }
}
