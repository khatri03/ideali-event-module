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
import { useRenameCustomList } from "../hooks/useCustomListMutations"
import { AddMembersDialog } from "./AddMembersDialog"
import { CustomListMembersTable } from "./CustomListMembersTable"
import { RequiredFieldLabel } from "./RequiredFieldLabel"

interface CustomListEditorProps {
  customListUniqueId: string
}

export function CustomListEditor({ customListUniqueId }: CustomListEditorProps) {
  const navigate = useNavigate()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const detailQuery = useCustomList(customListUniqueId)
  const renameMutation = useRenameCustomList()

  const detail = detailQuery.data

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<CustomListFormValues>({
    resolver: zodResolver(customListFormSchema),
    values: { name: detail?.name ?? "" },
  })

  async function handleRename(values: CustomListFormValues) {
    await renameMutation.mutateAsync({ uniqueId: customListUniqueId, name: values.name })
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

          <Button
            borderRadius="14px"
            h="44px"
            px={6}
            w={{ base: "full", md: "auto" }}
            color="white"
            cursor="pointer"
            onClick={() => setIsAddDialogOpen(true)}
            style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
          >
            <UserPlus size={16} />
            Add members
          </Button>
        </Flex>

        <CustomListMembersTable
          customListUniqueId={customListUniqueId}
          customListName={detail?.name ?? "this list"}
        />
      </Box>

      {isAddDialogOpen ? (
        <AddMembersDialog
          customListUniqueId={customListUniqueId}
          customListName={detail?.name ?? "this list"}
          onClose={() => setIsAddDialogOpen(false)}
        />
      ) : null}
    </Stack>
  )
}
