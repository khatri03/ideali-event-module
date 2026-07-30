import { z } from "zod"

// Mirrors CustomListService.ValidateName + CustomListCreateRequest/CustomListUpdateRequest on the API.
export const CUSTOM_LIST_NAME_MIN_LENGTH = 2
export const CUSTOM_LIST_NAME_MAX_LENGTH = 100

export const customListFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "List name is required.")
    .min(CUSTOM_LIST_NAME_MIN_LENGTH, `List name must be at least ${CUSTOM_LIST_NAME_MIN_LENGTH} characters.`)
    .max(CUSTOM_LIST_NAME_MAX_LENGTH, `List name must be ${CUSTOM_LIST_NAME_MAX_LENGTH} characters or fewer.`),
})

export type CustomListFormValues = z.infer<typeof customListFormSchema>

// Add/remove member operations require at least one member on both sides.
export const customListMembersSchema = z.object({
  memberUniqueIds: z.array(z.string().uuid()).min(1, "At least one member is required."),
})
