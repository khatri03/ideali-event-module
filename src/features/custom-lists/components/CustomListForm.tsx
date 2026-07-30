import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"
import { Box, Button, Field, Flex, Heading, Input, Stack, Text } from "@chakra-ui/react"
import { ArrowLeft } from "lucide-react"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { customListFormSchema, type CustomListFormValues } from "../schemas/customList.schemas"
import { useCreateCustomList } from "../hooks/useCustomListMutations"
import { MemberPicker } from "./MemberPicker"
import { RequiredFieldLabel } from "./RequiredFieldLabel"

export function CustomListForm() {
  const navigate = useNavigate()
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const createMutation = useCreateCustomList()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomListFormValues>({
    resolver: zodResolver(customListFormSchema),
    defaultValues: { name: "" },
  })

  function handleToggleMember(memberUniqueId: string) {
    setSelectedMemberIds((current) =>
      current.includes(memberUniqueId)
        ? current.filter((id) => id !== memberUniqueId)
        : [...current, memberUniqueId],
    )
  }

  async function handleSave(values: CustomListFormValues) {
    await createMutation.mutateAsync({ name: values.name, memberUniqueIds: selectedMemberIds })
    navigate(APP_ROUTES.customLists.list)
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
        <Heading fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="gray.900" mb={1}>
          New custom list
        </Heading>
        <Text fontSize={{ base: "sm", md: "md" }} color="gray.600" mb={6}>
          Name the list and pick at least one member. List names must be unique within your organization.
        </Text>

        <form onSubmit={handleSubmit(handleSave)} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <Field.Root invalid={Boolean(errors.name)} maxW={{ base: "full", md: "480px" }}>
            <RequiredFieldLabel>List name</RequiredFieldLabel>
            <Input {...register("name")} minH="11" borderRadius="14px" px={4} placeholder="VIP" autoFocus />
            {errors.name ? <Field.ErrorText>{errors.name.message}</Field.ErrorText> : null}
          </Field.Root>

          <Stack gap={2}>
            <Flex align="baseline" gap={2} flexWrap="wrap">
              <Text fontSize="sm" fontWeight="700" color="text.primary">
                Members
              </Text>
              <Text fontSize="xs" color="text.secondary">
                Optional — you can add members now or after the list is created.
              </Text>
            </Flex>
            <MemberPicker
              selectedMemberIds={selectedMemberIds}
              onToggleMember={handleToggleMember}
              onReplaceSelection={setSelectedMemberIds}
            />
          </Stack>

          {createMutation.error ? (
            <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
              <Text fontSize="sm" fontWeight="700" color="red.700">
                {extractApiError(createMutation.error)}
              </Text>
            </Box>
          ) : null}

          <Flex pt={5} borderTop="1px solid" borderColor="gray.200" justify="space-between" gap={3} flexWrap="wrap">
            <Button
              variant="outline"
              colorPalette="gray"
              borderRadius="14px"
              h="44px"
              px={6}
              minW={{ base: "full", md: "140px" }}
              cursor="pointer"
              onClick={() => navigate(APP_ROUTES.customLists.list)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              borderRadius="14px"
              h="44px"
              px={6}
              minW={{ base: "full", md: "180px" }}
              color="white"
              cursor="pointer"
              disabled={createMutation.isPending}
              loading={createMutation.isPending}
              loadingText="Creating..."
              style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
            >
              Create list
            </Button>
          </Flex>
        </form>
      </Box>
    </Stack>
  )
}
