import { useState } from "react"
import { Box, Field, Flex, HStack, Input, SimpleGrid, SkeletonText, Stack, Text, chakra } from "@chakra-ui/react"
import { Lock, Search } from "lucide-react"
import { type FieldErrors, type UseFormRegister, type UseFormSetValue } from "react-hook-form"
import { RequiredFieldLabel } from "@/features/custom-lists"
import { useDebounce } from "@/hooks/useDebounce"
import { extractApiError } from "@/utils/errors"
import { useCustomInvoiceBuyerMemberOptions } from "../hooks/useCustomInvoiceMutations"
import type { CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"

type BuyerSource = "manual" | "member"

interface CustomInvoiceBuyerSectionProps {
  register: UseFormRegister<CustomInvoiceFormValues>
  errors: FieldErrors<CustomInvoiceFormValues>
  setValue: UseFormSetValue<CustomInvoiceFormValues>
  disabled?: boolean
  /** Name and email were copied from a linked invoice and must not drift from it (D-12). */
  isNameAndEmailLocked?: boolean
}

const FIELD_LABEL_PROPS = { fontSize: "sm", fontWeight: "700", color: "text.primary" } as const

const LOCKED_INPUT_PROPS = { readOnly: true, cursor: "not-allowed", bg: "app.bg" } as const

/** First token is the given name, the rest the family name. A single token is treated as the last name,
 * since that is the field the invoice requires. */
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: "", lastName: "" }
  if (parts.length === 1) return { firstName: "", lastName: parts[0] }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

function SourceButton({
  isActive,
  disabled,
  label,
  onClick,
}: {
  isActive: boolean
  disabled: boolean
  label: string
  onClick: () => void
}) {
  return (
    <chakra.button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-pressed={isActive}
      disabled={disabled}
      display="flex"
      alignItems="center"
      justifyContent="center"
      flex={{ base: 1, md: "initial" }}
      minH="11"
      px={5}
      borderRadius="12px"
      fontWeight="700"
      fontSize="sm"
      cursor={disabled ? "not-allowed" : "pointer"}
      color={isActive ? "white" : "text.primary"}
      bg={isActive ? "brand.gradient" : "app.bg"}
      border="1px solid"
      borderColor={isActive ? "transparent" : "border.subtle"}
      opacity={disabled ? 0.6 : 1}
      onClick={disabled ? undefined : onClick}
    >
      {label}
    </chakra.button>
  )
}

/**
 * The buyer block: pick an existing member or free-type the details. A member pick prefills the structured
 * fields but leaves every one editable (LD-9, BUYER-02), and switching back to manual drops the member link
 * without clearing what was typed. Company, Last name and a routable Email are required to issue (BUYER-03).
 * A disabled flag - a paid invoice being read - makes the toggle, search and every field inert. While the
 * invoice is linked, name and email are read-only and the member picker is off; company and phone stay open.
 */
export function CustomInvoiceBuyerSection({
  register,
  errors,
  setValue,
  disabled = false,
  isNameAndEmailLocked = false,
}: CustomInvoiceBuyerSectionProps) {
  const isSourceLocked = disabled || isNameAndEmailLocked
  const lockedProps = isNameAndEmailLocked ? LOCKED_INPUT_PROPS : {}
  const [source, setSource] = useState<BuyerSource>("manual")
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const membersQuery = useCustomInvoiceBuyerMemberOptions(source === "member" ? debouncedSearchTerm : "")

  const members = membersQuery.data?.items ?? []
  const hasSearched = source === "member" && debouncedSearchTerm.trim().length >= 2

  function handleSourceChange(next: BuyerSource) {
    setSource(next)
    if (next === "manual") {
      setValue("memberUniqueId", "", { shouldDirty: true })
    }
  }

  function handlePickMember(member: { memberUniqueId: string; fullName: string; email: string | null }) {
    const { firstName, lastName } = splitFullName(member.fullName)
    setValue("memberUniqueId", member.memberUniqueId, { shouldDirty: true })
    setValue("firstName", firstName, { shouldDirty: true })
    setValue("lastName", lastName, { shouldDirty: true, shouldValidate: true })
    setValue("email", member.email ?? "", { shouldDirty: true, shouldValidate: true })
  }

  return (
    <Stack gap={5}>
      <HStack role="tablist" aria-label="Buyer source" gap={3} w={{ base: "full", md: "auto" }}>
        <SourceButton
          isActive={source === "manual"}
          disabled={isSourceLocked}
          label="Enter manually"
          onClick={() => handleSourceChange("manual")}
        />
        <SourceButton
          isActive={source === "member"}
          disabled={isSourceLocked}
          label="Existing member"
          onClick={() => handleSourceChange("member")}
        />
      </HStack>

      {source === "member" && !isSourceLocked ? (
        <Stack gap={3}>
          <Flex position="relative" align="center" w="full">
            <Box position="absolute" left={3} color="gray.400" pointerEvents="none" display="flex">
              <Search size={16} />
            </Box>
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search members by name or email"
              aria-label="Search members"
              minH="11"
              borderRadius="12px"
              pl={9}
            />
          </Flex>

          {membersQuery.isError ? (
            <Text fontSize="sm" fontWeight="700" color="status.error.fg">
              {extractApiError(membersQuery.error)}
            </Text>
          ) : hasSearched && membersQuery.isFetching ? (
            <Box px={1} py={2}>
              <SkeletonText noOfLines={3} gap="3" />
            </Box>
          ) : hasSearched && members.length === 0 ? (
            <Text fontSize="sm" color="text.secondary">
              No members match this search.
            </Text>
          ) : members.length > 0 ? (
            <Stack gap={2} maxH="240px" overflowY="auto" border="1px solid" borderColor="border.subtle" borderRadius="14px" p={2}>
              {members.map((member) => (
                <chakra.button
                  key={member.memberUniqueId}
                  type="button"
                  display="flex"
                  flexDirection="column"
                  alignItems="flex-start"
                  gap={0.5}
                  textAlign="left"
                  minH="11"
                  px={3}
                  py={2}
                  borderRadius="10px"
                  cursor="pointer"
                  _hover={{ bg: "app.bg" }}
                  onClick={() => handlePickMember(member)}
                >
                  <Text fontSize="sm" fontWeight="700" color="text.primary">
                    {member.fullName}
                  </Text>
                  <Text fontSize="xs" color="text.secondary">
                    {member.email ?? "—"}
                  </Text>
                </chakra.button>
              ))}
            </Stack>
          ) : null}
        </Stack>
      ) : null}

      {isNameAndEmailLocked ? (
        <Flex align="center" gap={2} color="text.secondary">
          <Lock size={14} aria-hidden="true" />
          <Text fontSize="sm">Locked while this invoice is linked.</Text>
        </Flex>
      ) : null}

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        <Field.Root invalid={Boolean(errors.companyName)}>
          <RequiredFieldLabel>Company name</RequiredFieldLabel>
          <Input minH="11" borderRadius="12px" autoComplete="off" disabled={disabled} {...register("companyName")} />
          <Field.ErrorText>{errors.companyName?.message}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={Boolean(errors.email)}>
          <RequiredFieldLabel>Email address</RequiredFieldLabel>
          <Input minH="11" borderRadius="12px" inputMode="email" autoComplete="off" disabled={disabled} {...lockedProps} {...register("email")} />
          <Field.ErrorText>{errors.email?.message}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={Boolean(errors.firstName)}>
          <Field.Label {...FIELD_LABEL_PROPS}>First name</Field.Label>
          <Input minH="11" borderRadius="12px" autoComplete="off" disabled={disabled} {...lockedProps} {...register("firstName")} />
          <Field.ErrorText>{errors.firstName?.message}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={Boolean(errors.middleName)}>
          <Field.Label {...FIELD_LABEL_PROPS}>Middle name</Field.Label>
          <Input minH="11" borderRadius="12px" autoComplete="off" disabled={disabled} {...lockedProps} {...register("middleName")} />
          <Field.ErrorText>{errors.middleName?.message}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={Boolean(errors.lastName)}>
          <RequiredFieldLabel>Last name</RequiredFieldLabel>
          <Input minH="11" borderRadius="12px" autoComplete="off" disabled={disabled} {...lockedProps} {...register("lastName")} />
          <Field.ErrorText>{errors.lastName?.message}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={Boolean(errors.cellPhone)}>
          <Field.Label {...FIELD_LABEL_PROPS}>Cell phone</Field.Label>
          <Input minH="11" borderRadius="12px" autoComplete="off" disabled={disabled} {...register("cellPhone")} />
          <Field.ErrorText>{errors.cellPhone?.message}</Field.ErrorText>
        </Field.Root>
      </SimpleGrid>
    </Stack>
  )
}
