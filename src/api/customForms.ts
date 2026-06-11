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

const customFormPreviewOptionSchema = z.object({
  Id: z.number().int().optional(),
  id: z.number().int().optional(),
  Value: z.string().optional(),
  value: z.string().optional(),
  DisplayText: z.string().optional(),
  displayText: z.string().optional(),
})

const customFormPreviewFieldSchema = z.object({
  Id: z.number().int().optional(),
  id: z.number().int().optional(),
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  FormId: z.number().int().optional(),
  formId: z.number().int().optional(),
  FormControlTypeId: z.number().int().optional(),
  formControlTypeId: z.number().int().optional(),
  ControlUniqueId: z.string().nullable().optional(),
  controlUniqueId: z.string().nullable().optional(),
  DisplayOrder: z.number().int().optional(),
  displayOrder: z.number().int().optional(),
  LayoutColumn: z.number().int().nullable().optional(),
  layoutColumn: z.number().int().nullable().optional(),
  ControlLabel: z.string().optional(),
  controlLabel: z.string().optional(),
  PlaceHolder: z.string().nullable().optional(),
  placeHolder: z.string().nullable().optional(),
  Tooltip: z.string().nullable().optional(),
  tooltip: z.string().nullable().optional(),
  IsMandatory: z.boolean().optional(),
  isMandatory: z.boolean().optional(),
  RequiredMessage: z.string().nullable().optional(),
  requiredMessage: z.string().nullable().optional(),
  AcceptedFileTypes: z.array(z.string()).nullable().optional(),
  acceptedFileTypes: z.array(z.string()).nullable().optional(),
  MinLength: z.string().nullable().optional(),
  minLength: z.string().nullable().optional(),
  MaxLength: z.string().nullable().optional(),
  maxLength: z.string().nullable().optional(),
  DefaultValue: z.string().nullable().optional(),
  defaultValue: z.string().nullable().optional(),
  Options: z.array(customFormPreviewOptionSchema).optional(),
  options: z.array(customFormPreviewOptionSchema).optional(),
  FormControl: z
    .object({
      Id: z.number().int().optional(),
      id: z.number().int().optional(),
      Name: z.string().optional(),
      name: z.string().optional(),
      CanBeRequired: z.boolean().optional(),
      canBeRequired: z.boolean().optional(),
      CanHaveMaxLength: z.boolean().optional(),
      canHaveMaxLength: z.boolean().optional(),
      CanHaveMinLength: z.boolean().optional(),
      canHaveMinLength: z.boolean().optional(),
      CanHavePlaceHolder: z.boolean().optional(),
      canHavePlaceHolder: z.boolean().optional(),
      ControlType: z.string().optional(),
      controlType: z.string().optional(),
      DefaultLabel: z.string().optional(),
      defaultLabel: z.string().optional(),
      HasOptions: z.boolean().optional(),
      hasOptions: z.boolean().optional(),
      IconClass: z.string().optional(),
      iconClass: z.string().optional(),
      AcceptedFileTypes: z.array(customFormListItemSchema).nullable().optional(),
      acceptedFileTypes: z.array(customFormListItemSchema).nullable().optional(),
    })
    .nullable()
    .optional(),
  formControl: z
    .object({
      Id: z.number().int().optional(),
      id: z.number().int().optional(),
      Name: z.string().optional(),
      name: z.string().optional(),
      CanBeRequired: z.boolean().optional(),
      canBeRequired: z.boolean().optional(),
      CanHaveMaxLength: z.boolean().optional(),
      canHaveMaxLength: z.boolean().optional(),
      CanHaveMinLength: z.boolean().optional(),
      canHaveMinLength: z.boolean().optional(),
      CanHavePlaceHolder: z.boolean().optional(),
      canHavePlaceHolder: z.boolean().optional(),
      ControlType: z.string().optional(),
      controlType: z.string().optional(),
      DefaultLabel: z.string().optional(),
      defaultLabel: z.string().optional(),
      HasOptions: z.boolean().optional(),
      hasOptions: z.boolean().optional(),
      IconClass: z.string().optional(),
      iconClass: z.string().optional(),
      AcceptedFileTypes: z.array(customFormListItemSchema).nullable().optional(),
      acceptedFileTypes: z.array(customFormListItemSchema).nullable().optional(),
    })
    .nullable()
    .optional(),
})

const customFormPreviewSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  HeaderText: z.string().nullable().optional(),
  headerText: z.string().nullable().optional(),
  Description: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  LayoutColumn: z.number().int().nullable().optional(),
  layoutColumn: z.number().int().nullable().optional(),
  Fields: z.array(customFormPreviewFieldSchema).optional(),
  fields: z.array(customFormPreviewFieldSchema).optional(),
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
  const preview = customFormPreviewSchema.parse(responseData)

  return {
    uniqueId: preview.UniqueId ?? preview.uniqueId ?? "",
    name: preview.Name ?? preview.name ?? "",
    headerText: preview.HeaderText ?? preview.headerText ?? "",
    description: preview.Description ?? preview.description ?? null,
    layoutColumn: preview.LayoutColumn ?? preview.layoutColumn ?? null,
    fields: (preview.Fields ?? preview.fields ?? []).map((field) => ({
      id: field.Id ?? field.id ?? 0,
      uniqueId: field.UniqueId ?? field.uniqueId ?? "",
      formId: field.FormId ?? field.formId ?? 0,
      formControlTypeId: field.FormControlTypeId ?? field.formControlTypeId ?? 0,
      controlUniqueId: field.ControlUniqueId ?? field.controlUniqueId ?? null,
      displayOrder: field.DisplayOrder ?? field.displayOrder ?? 0,
      layoutColumn: field.LayoutColumn ?? field.layoutColumn ?? null,
      controlLabel: field.ControlLabel ?? field.controlLabel ?? "",
      placeHolder: field.PlaceHolder ?? field.placeHolder ?? null,
      tooltip: field.Tooltip ?? field.tooltip ?? null,
      isMandatory: field.IsMandatory ?? field.isMandatory ?? false,
      requiredMessage: field.RequiredMessage ?? field.requiredMessage ?? null,
      acceptedFileTypes: field.AcceptedFileTypes ?? field.acceptedFileTypes ?? null,
      minLength: field.MinLength ?? field.minLength ?? null,
      maxLength: field.MaxLength ?? field.maxLength ?? null,
      defaultValue: field.DefaultValue ?? field.defaultValue ?? null,
      options: (field.Options ?? field.options ?? []).map((option) => ({
        id: option.Id ?? option.id ?? 0,
        value: option.Value ?? option.value ?? "",
        displayText: option.DisplayText ?? option.displayText ?? "",
      })),
      formControl:
        field.FormControl ?? field.formControl
          ? {
              id: (field.FormControl ?? field.formControl)?.Id ?? (field.FormControl ?? field.formControl)?.id ?? 0,
              name: (field.FormControl ?? field.formControl)?.Name ?? (field.FormControl ?? field.formControl)?.name ?? "",
              canBeRequired:
                (field.FormControl ?? field.formControl)?.CanBeRequired ??
                (field.FormControl ?? field.formControl)?.canBeRequired ??
                false,
              canHaveMaxLength:
                (field.FormControl ?? field.formControl)?.CanHaveMaxLength ??
                (field.FormControl ?? field.formControl)?.canHaveMaxLength ??
                false,
              canHaveMinLength:
                (field.FormControl ?? field.formControl)?.CanHaveMinLength ??
                (field.FormControl ?? field.formControl)?.canHaveMinLength ??
                false,
              canHavePlaceHolder:
                (field.FormControl ?? field.formControl)?.CanHavePlaceHolder ??
                (field.FormControl ?? field.formControl)?.canHavePlaceHolder ??
                false,
              controlType:
                (field.FormControl ?? field.formControl)?.ControlType ??
                (field.FormControl ?? field.formControl)?.controlType ??
                "",
              defaultLabel:
                (field.FormControl ?? field.formControl)?.DefaultLabel ??
                (field.FormControl ?? field.formControl)?.defaultLabel ??
                "",
              hasOptions:
                (field.FormControl ?? field.formControl)?.HasOptions ??
                (field.FormControl ?? field.formControl)?.hasOptions ??
                false,
              iconClass:
                (field.FormControl ?? field.formControl)?.IconClass ??
                (field.FormControl ?? field.formControl)?.iconClass ??
                "",
              acceptedFileTypes: (
                (field.FormControl ?? field.formControl)?.AcceptedFileTypes ??
                (field.FormControl ?? field.formControl)?.acceptedFileTypes ??
                []
              ).map((item) => ({
                text: item.Text ?? item.text ?? "",
                value: item.Value ?? item.value ?? "",
              })),
            }
          : null,
    })),
  }
}
