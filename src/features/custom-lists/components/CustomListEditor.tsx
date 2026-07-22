import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"
import { Box, Button, Field, Flex, Heading, Input, SkeletonText, Stack, Text } from "@chakra-ui/react"
import { ArrowLeft, UserPlus } from "lucide-react"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { customListFormSchema, type CustomListFormValues } from "../schemas/customList.schemas"
import { useCustomList } from "../hooks/useCustomLists"
import { useAddCustomListMembers, useRenameCustomList } from "../hooks/useCustomListMutations"
import { CustomListMembersTable } from "./CustomListMembersTable"
import { MemberPicker } from "./MemberPicker"
import { RequiredFieldLabel } from "./RequiredFieldLabel"

interface CustomListEditorProps {
  customListUniqueId: string
}

export function CustomListEditor({ customListUniqueId }: CustomListEditorProps) {
  const navigate = useNavigate()
  const [isAdding, setIsAdding] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

  const detailQuery = useCustomList(customListUniqueId)
  const renameMutation = useRenameCustomList()
  const addMutation = useAddCustomListMembers()

  const detail = detailQuery.data

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<CustomListFormValues>({
    resolver: zodResolver(customListFormSchema),
    values: { name: detail?.name ?? "" },
  })

  function handleToggleMember(memberUniqueId: string) {
    setSelectedMemberIds((current) =>
      current.includes(memberUniqueId)
        ? current.filter((id) => id !== memberUniqueId)
        : [...current, memberUniqueId],
    )
  }

  async function handleRename(values: CustomListFormValues) {
    await renameMutation.mutateAsync({ uniqueId: customListUniqueId, name: values.name })
  }

  async function handleAddMembers() {
    if (selectedMemberIds.length === 0) {
      return
    }

    await addMutation.mutateAsync({ uniqueId: customListUniqueId, memberUniqueIds: selectedMemberIds })
    setSelectedMemberIds([])
    setIsAdding(false)
  }

  if (detailQuery.isError) {
    return (
      <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
        <Text fontSize="sm" fontWeight="700" color="red.700">
          {extractApiError(detailQuery.error)}
        </Text>
      </Box>
    )
  }

  return (
    <Stack gap={5}>
      <Flex align="center" gap={3} flexWrap="wrap">
        <Button
          variant="outline"
          borderRadius="14px"
          minH="11"
          px={4}
          cursor="pointer"
          onClick={() => navigate(APP_ROUTES.customLists.list)}
        >
          <ArrowLeft size={16} />
          Back to lists
        </Button>
      </Flex>

      <Box
        borderRadius="20px"
        border="1px solid"
        borderColor="border.subtle"
        bg="card.bg"
        boxShadow="card"
        p={{ base: 4, md: 6 }}
      >
        {detailQuery.isLoading && !detail ? (
          <SkeletonText noOfLines={3} />
        ) : (
          <form onSubmit={handleSubmit(handleRename)}>
            <Heading fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="gray.900" mb={4}>
              {detail?.name}
            </Heading>

            <Flex align="flex-end" gap={3} flexWrap="wrap">
              <Field.Root invalid={Boolean(errors.name)} maxW={{ base: "full", md: "420px" }} flex={1}>
                <RequiredFieldLabel>List name</RequiredFieldLabel>
                <Input {...register("name")} minH="11" borderRadius="14px" px={4} />
                {errors.name ? <Field.ErrorText>{errors.name.message}</Field.ErrorText> : null}
              </Field.Root>

              <Button
                type="submit"
                borderRadius="14px"
                h="44px"
                px={6}
                w={{ base: "full", md: "auto" }}
                cursor={renameMutation.isPending || !isDirty ? "not-allowed" : "pointer"}
                disabled={renameMutation.isPending || !isDirty}
                loading={renameMutation.isPending}
                loadingText="Saving..."
              >
                Save name
              </Button>
            </Flex>

            {renameMutation.error ? (
              <Box mt={4} p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
                <Text fontSize="sm" fontWeight="700" color="red.700">
                  {extractApiError(renameMutation.error)}
                </Text>
              </Box>
            ) : null}
          </form>
        )}
      </Box>

      <Box
        borderRadius="20px"
        border="1px solid"
        borderColor="border.subtle"
        bg="card.bg"
        boxShadow="card"
        p={{ base: 4, md: 6 }}
      >
        <Flex
          align={{ base: "stretch", md: "center" }}
          justify="space-between"
          gap={3}
          direction={{ base: "column", md: "row" }}
          mb={5}
        >
          <Box>
            <Text fontSize="lg" fontWeight="700" color="text.primary">
              Members
            </Text>
            <Text fontSize="sm" color="text.secondary">
              Sort any column, search, or remove a member from this list.
            </Text>
          </Box>

          {isAdding ? null : (
            <Button
              variant="outline"
              borderRadius="14px"
              h="44px"
              px={6}
              w={{ base: "full", md: "auto" }}
              cursor="pointer"
              onClick={() => setIsAdding(true)}
            >
              <UserPlus size={16} />
              Add members
            </Button>
          )}
        </Flex>

        <Stack gap={5}>
          {isAdding ? (
            <Box borderRadius="18px" border="1px solid" borderColor="border.subtle" p={{ base: 3, md: 4 }}>
              <MemberPicker
                selectedMemberIds={selectedMemberIds}
                onToggleMember={handleToggleMember}
                onReplaceSelection={setSelectedMemberIds}
                excludingCustomListUniqueId={customListUniqueId}
                emptyMessage="Every matching member is already in this list."
              />

              {addMutation.error ? (
                <Box mt={4} p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
                  <Text fontSize="sm" fontWeight="700" color="red.700">
                    {extractApiError(addMutation.error)}
                  </Text>
                </Box>
              ) : null}

              <Flex gap={3} flexWrap="wrap" mt={4}>
                <Button
                  variant="outline"
                  borderRadius="14px"
                  h="44px"
                  px={6}
                  cursor="pointer"
                  onClick={() => {
                    setIsAdding(false)
                    setSelectedMemberIds([])
                  }}
                >
                  Cancel
                </Button>
                <Button
                  borderRadius="14px"
                  h="44px"
                  px={6}
                  color="white"
                  cursor={addMutation.isPending || selectedMemberIds.length === 0 ? "not-allowed" : "pointer"}
                  disabled={addMutation.isPending || selectedMemberIds.length === 0}
                  loading={addMutation.isPending}
                  loadingText="Adding..."
                  onClick={handleAddMembers}
                  style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                >
                  Add {selectedMemberIds.length || ""} member{selectedMemberIds.length === 1 ? "" : "s"}
                </Button>
              </Flex>
            </Box>
          ) : null}

          <CustomListMembersTable
            customListUniqueId={customListUniqueId}
            customListName={detail?.name ?? "this list"}
          />
        </Stack>
      </Box>
    </Stack>
  )
}
