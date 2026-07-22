import { useState } from "react"
import { Box, Button, CloseButton, Dialog, Flex, Text } from "@chakra-ui/react"
import { UserPlus } from "lucide-react"
import { extractApiError } from "@/utils/errors"
import { useAddCustomListMembers } from "../hooks/useCustomListMutations"
import { MemberPicker } from "./MemberPicker"

interface AddMembersDialogProps {
  customListUniqueId: string
  customListName: string
  onClose: () => void
}

export function AddMembersDialog({ customListUniqueId, customListName, onClose }: AddMembersDialogProps) {
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const addMutation = useAddCustomListMembers()

  function handleToggleMember(memberUniqueId: string) {
    setSelectedMemberIds((current) =>
      current.includes(memberUniqueId)
        ? current.filter((id) => id !== memberUniqueId)
        : [...current, memberUniqueId],
    )
  }

  async function handleAddMembers() {
    if (selectedMemberIds.length === 0) {
      return
    }

    await addMutation.mutateAsync({ uniqueId: customListUniqueId, memberUniqueIds: selectedMemberIds })
    onClose()
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(details) => (details.open ? null : onClose())}
      size={{ base: "full", md: "xl" }}
      scrollBehavior="inside"
    >
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
      <Dialog.Positioner>
        <Dialog.Content
          bg="white"
          borderRadius={{ base: 0, md: "24px" }}
          maxW={{ base: "100vw", md: "900px" }}
          h={{ base: "100dvh", md: "auto" }}
          maxH={{ base: "100dvh", md: "90vh" }}
          m={{ base: 0, md: "auto" }}
          overflow="hidden"
          display="flex"
          flexDirection="column"
        >
          <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="gray.200" flexShrink={0}>
            <Flex align="flex-start" justify="space-between" gap={4}>
              <Box>
                <Dialog.Title fontSize="lg" fontWeight="800" color="gray.900">
                  Add members
                </Dialog.Title>
                <Text fontSize="sm" color="gray.600">
                  Adding to <strong>{customListName}</strong>. Members already in this list are hidden.
                </Text>
              </Box>

              <Dialog.CloseTrigger asChild>
                <CloseButton aria-label="Close add members dialog" cursor="pointer" />
              </Dialog.CloseTrigger>
            </Flex>
          </Box>

          <Dialog.Body px={6} py={6} overflowY="auto" flex={1}>
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
          </Dialog.Body>

          <Flex
            px={6}
            py={4}
            borderTop="1px solid"
            borderColor="gray.200"
            align={{ base: "stretch", md: "center" }}
            justify="space-between"
            direction={{ base: "column", md: "row" }}
            gap={3}
            flexShrink={0}
            bg="app.bg"
          >
            <Text fontSize="sm" fontWeight="700" color="text.primary">
              {selectedMemberIds.length} member{selectedMemberIds.length === 1 ? "" : "s"} selected
            </Text>

            <Flex gap={3} direction={{ base: "column-reverse", md: "row" }}>
              <Button
                variant="outline"
                colorPalette="gray"
                borderRadius="14px"
                h="44px"
                px={6}
                minW={{ base: "full", md: "120px" }}
                cursor="pointer"
                onClick={onClose}
              >
                Cancel
              </Button>

              <Button
                borderRadius="14px"
                h="44px"
                px={6}
                minW={{ base: "full", md: "180px" }}
                color="white"
                cursor={addMutation.isPending || selectedMemberIds.length === 0 ? "not-allowed" : "pointer"}
                disabled={addMutation.isPending || selectedMemberIds.length === 0}
                loading={addMutation.isPending}
                loadingText="Adding..."
                onClick={handleAddMembers}
                style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
              >
                <UserPlus size={16} />
                Add {selectedMemberIds.length || ""} member{selectedMemberIds.length === 1 ? "" : "s"}
              </Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
