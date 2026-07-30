import { z } from "zod"
import { client } from "@/api/client"
import type { ServiceResponse } from "@/api/types"
import { API_ROUTES } from "@/utils/routes"

const serviceResponseSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().nullable().optional(),
  errorCode: z.string().nullable().optional(),
  validationErrors: z.record(z.string(), z.array(z.string())).nullable().optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
  timestamp: z.string().optional(),
  Data: z.unknown().optional(),
  data: z.unknown().optional(),
})

const customListSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  MemberCount: z.number().int().optional(),
  memberCount: z.number().int().optional(),
  CreatedOnUtc: z.string().optional(),
  createdOnUtc: z.string().optional(),
})

const customListOptionSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  MemberCount: z.number().int().optional(),
  memberCount: z.number().int().optional(),
})

const membershipTypeOptionSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  ActiveMemberCount: z.number().int().optional(),
  activeMemberCount: z.number().int().optional(),
})

const customListMemberSchema = z.object({
  MemberUniqueId: z.string().optional(),
  memberUniqueId: z.string().optional(),
  FullName: z.string().optional(),
  fullName: z.string().optional(),
  Email: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  MembershipTypeName: z.string().nullable().optional(),
  membershipTypeName: z.string().nullable().optional(),
  AddedOnUtc: z.string().nullable().optional(),
  addedOnUtc: z.string().nullable().optional(),
  OtherLists: z.array(customListOptionSchema).nullable().optional(),
  otherLists: z.array(customListOptionSchema).nullable().optional(),
})

const customListMemberPageSchema = z.object({
  PageNo: z.number().int().optional(),
  pageNo: z.number().int().optional(),
  PageSize: z.number().int().optional(),
  pageSize: z.number().int().optional(),
  PageCount: z.number().int().optional(),
  pageCount: z.number().int().optional(),
  TotalRecordsCount: z.number().int().optional(),
  totalRecordsCount: z.number().int().optional(),
  PageData: z.array(customListMemberSchema).optional(),
  pageData: z.array(customListMemberSchema).optional(),
})

const customListDetailSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  MemberCount: z.number().int().optional(),
  memberCount: z.number().int().optional(),
})

const customListPageSchema = z.object({
  PageNo: z.number().int().optional(),
  pageNo: z.number().int().optional(),
  PageSize: z.number().int().optional(),
  pageSize: z.number().int().optional(),
  PageCount: z.number().int().optional(),
  pageCount: z.number().int().optional(),
  TotalRecordsCount: z.number().int().optional(),
  totalRecordsCount: z.number().int().optional(),
  PageData: z.array(customListSchema).optional(),
  pageData: z.array(customListSchema).optional(),
})

export type CustomListSortBy = "name" | "memberCount" | "createdOnUtc"
export type CustomListSortOrder = "asc" | "desc"

export interface CustomListFilters {
  searchTerm: string
  customListUniqueIds: string[]
  sortBy: CustomListSortBy
  sortOrder: CustomListSortOrder
}

export interface CustomListItem {
  uniqueId: string
  name: string
  memberCount: number
  createdOnUtc: string
}

/** Minimal list reference — used by the "Also In" tags, which never show a count. */
export interface CustomListRef {
  uniqueId: string
  name: string
}

export interface CustomListOption extends CustomListRef {
  memberCount: number
}

export interface CustomListMembershipTypeOption {
  uniqueId: string
  name: string
  activeMemberCount: number
}

export type CustomListMemberSortBy = "fullName" | "email" | "membershipTypeName" | "addedOnUtc"

export interface CustomListMemberFilters {
  searchTerm: string
  membershipTypeUniqueIds: string[]
  sortBy: CustomListMemberSortBy
  sortOrder: CustomListSortOrder
}

export interface CustomListMember {
  memberUniqueId: string
  fullName: string
  email: string | null
  membershipTypeName: string | null
  addedOnUtc: string | null
  otherLists: CustomListRef[]
}

export interface CustomListMemberOptionPage {
  items: CustomListMember[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CustomListDetail {
  uniqueId: string
  name: string
  memberCount: number
}

export interface CustomListPage {
  items: CustomListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

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
  const response = serviceResponseSchema.parse(payload) as ServiceResponse<unknown> | { Data?: unknown; data?: unknown }
  return readResponseData(response)
}

function assertSuccess(payload: unknown, fallbackMessage: string): void {
  const response = serviceResponseSchema.parse(payload)
  if (response.success === false) {
    throw new Error(response.message ?? fallbackMessage)
  }
}

function normalizeCustomList(item: z.infer<typeof customListSchema>): CustomListItem {
  return {
    uniqueId: item.UniqueId ?? item.uniqueId ?? "",
    name: item.Name ?? item.name ?? "",
    memberCount: item.MemberCount ?? item.memberCount ?? 0,
    createdOnUtc: item.CreatedOnUtc ?? item.createdOnUtc ?? "",
  }
}

function normalizeCustomListMember(item: z.infer<typeof customListMemberSchema>): CustomListMember {
  return {
    memberUniqueId: item.MemberUniqueId ?? item.memberUniqueId ?? "",
    fullName: item.FullName ?? item.fullName ?? "",
    email: item.Email ?? item.email ?? null,
    membershipTypeName: item.MembershipTypeName ?? item.membershipTypeName ?? null,
    addedOnUtc: item.AddedOnUtc ?? item.addedOnUtc ?? null,
    otherLists: (item.OtherLists ?? item.otherLists ?? [])
      .map((option) => ({
        uniqueId: option.UniqueId ?? option.uniqueId ?? "",
        name: option.Name ?? option.name ?? "",
      }))
      .filter((option) => option.uniqueId && option.name),
  }
}

export async function fetchCustomLists(
  filters: CustomListFilters,
  pageNo: number,
  pageSize: number,
): Promise<CustomListPage> {
  const params = new URLSearchParams()
  params.set("pageNo", String(pageNo))
  params.set("pageSize", String(pageSize))
  params.set("sortBy", filters.sortBy)
  params.set("sortOrder", filters.sortOrder)

  if (filters.searchTerm.trim()) {
    params.set("searchTerm", filters.searchTerm.trim())
  }

  filters.customListUniqueIds.forEach((uniqueId) => params.append("customListUniqueIds", uniqueId))

  const response = await client.get<unknown>(API_ROUTES.customLists, { params })
  const parsed = customListPageSchema.parse(parseServicePayload(response.data))
  const items = (parsed.PageData ?? parsed.pageData ?? []).map(normalizeCustomList)

  return {
    items,
    total: parsed.TotalRecordsCount ?? parsed.totalRecordsCount ?? items.length,
    page: parsed.PageNo ?? parsed.pageNo ?? pageNo,
    pageSize: parsed.PageSize ?? parsed.pageSize ?? pageSize,
    totalPages: parsed.PageCount ?? parsed.pageCount ?? 0,
  }
}

export async function fetchCustomListOptions(): Promise<CustomListOption[]> {
  const response = await client.get<unknown>(API_ROUTES.customListOptions)
  const parsed = z.array(customListOptionSchema).parse(parseServicePayload(response.data))

  return parsed
    .map((item) => ({
      uniqueId: item.UniqueId ?? item.uniqueId ?? "",
      name: item.Name ?? item.name ?? "",
      memberCount: item.MemberCount ?? item.memberCount ?? 0,
    }))
    .filter((option) => option.uniqueId && option.name)
}

export async function fetchCustomListMembershipTypeOptions(): Promise<CustomListMembershipTypeOption[]> {
  const response = await client.get<unknown>(API_ROUTES.customListMembershipTypeOptions)
  const parsed = z.array(membershipTypeOptionSchema).parse(parseServicePayload(response.data))

  return parsed
    .map((item) => ({
      uniqueId: item.UniqueId ?? item.uniqueId ?? "",
      name: item.Name ?? item.name ?? "",
      activeMemberCount: item.ActiveMemberCount ?? item.activeMemberCount ?? 0,
    }))
    .filter((option) => option.uniqueId && option.name)
}

export async function fetchCustomList(uniqueId: string): Promise<CustomListDetail> {
  const response = await client.get<unknown>(API_ROUTES.customListDetail(uniqueId))
  const parsed = customListDetailSchema.parse(parseServicePayload(response.data))

  return {
    uniqueId: parsed.UniqueId ?? parsed.uniqueId ?? "",
    name: parsed.Name ?? parsed.name ?? "",
    memberCount: parsed.MemberCount ?? parsed.memberCount ?? 0,
  }
}

export async function fetchCustomListMembers(
  uniqueId: string,
  filters: CustomListMemberFilters,
  pageNo: number,
  pageSize: number,
): Promise<CustomListMemberOptionPage> {
  const params = new URLSearchParams()
  params.set("pageNo", String(pageNo))
  params.set("pageSize", String(pageSize))
  params.set("sortBy", filters.sortBy)
  params.set("sortOrder", filters.sortOrder)

  if (filters.searchTerm.trim()) {
    params.set("searchTerm", filters.searchTerm.trim())
  }

  filters.membershipTypeUniqueIds.forEach((membershipTypeUniqueId) =>
    params.append("membershipTypeUniqueIds", membershipTypeUniqueId),
  )

  const response = await client.get<unknown>(API_ROUTES.customListMembers(uniqueId), { params })
  const parsed = customListMemberPageSchema.parse(parseServicePayload(response.data))
  const items = (parsed.PageData ?? parsed.pageData ?? []).map(normalizeCustomListMember)

  return {
    items,
    total: parsed.TotalRecordsCount ?? parsed.totalRecordsCount ?? items.length,
    page: parsed.PageNo ?? parsed.pageNo ?? pageNo,
    pageSize: parsed.PageSize ?? parsed.pageSize ?? pageSize,
    totalPages: parsed.PageCount ?? parsed.pageCount ?? 0,
  }
}

export type CustomListMemberOptionSortBy = "fullName" | "email" | "membershipTypeName"

export async function fetchCustomListMemberOptions(
  searchTerm: string,
  membershipTypeUniqueIds: string[],
  sortBy: CustomListMemberOptionSortBy,
  sortOrder: CustomListSortOrder,
  pageNo: number,
  pageSize: number,
  excludingCustomListUniqueId?: string,
): Promise<CustomListMemberOptionPage> {
  const params = new URLSearchParams()
  params.set("pageNo", String(pageNo))
  params.set("pageSize", String(pageSize))
  params.set("sortBy", sortBy)
  params.set("sortOrder", sortOrder)

  if (searchTerm.trim()) {
    params.set("searchTerm", searchTerm.trim())
  }

  if (excludingCustomListUniqueId) {
    params.set("excludingCustomListUniqueId", excludingCustomListUniqueId)
  }

  membershipTypeUniqueIds.forEach((uniqueId) => params.append("membershipTypeUniqueIds", uniqueId))

  const response = await client.get<unknown>(API_ROUTES.customListMemberOptions, { params })
  const parsed = customListMemberPageSchema.parse(parseServicePayload(response.data))
  const items = (parsed.PageData ?? parsed.pageData ?? []).map(normalizeCustomListMember)

  return {
    items,
    total: parsed.TotalRecordsCount ?? parsed.totalRecordsCount ?? items.length,
    page: parsed.PageNo ?? parsed.pageNo ?? pageNo,
    pageSize: parsed.PageSize ?? parsed.pageSize ?? pageSize,
    totalPages: parsed.PageCount ?? parsed.pageCount ?? 0,
  }
}

export async function createCustomList(name: string, memberUniqueIds: string[]): Promise<void> {
  const response = await client.post<unknown>(API_ROUTES.customListCreate, { name, memberUniqueIds })
  assertSuccess(response.data, "Failed to create custom list.")
}

export async function renameCustomList(uniqueId: string, name: string): Promise<void> {
  const response = await client.post<unknown>(API_ROUTES.customListUpdate(uniqueId), { name })
  assertSuccess(response.data, "Failed to rename custom list.")
}

export async function deleteCustomList(uniqueId: string): Promise<void> {
  const response = await client.delete<unknown>(API_ROUTES.customListDelete(uniqueId))
  assertSuccess(response.data, "Failed to delete custom list.")
}

export async function addCustomListMembers(uniqueId: string, memberUniqueIds: string[]): Promise<void> {
  const response = await client.post<unknown>(API_ROUTES.customListMembers(uniqueId), { memberUniqueIds })
  assertSuccess(response.data, "Failed to add members.")
}

export async function removeCustomListMembers(uniqueId: string, memberUniqueIds: string[]): Promise<void> {
  const response = await client.delete<unknown>(API_ROUTES.customListMembers(uniqueId), {
    data: { memberUniqueIds },
  })
  assertSuccess(response.data, "Failed to remove members.")
}
