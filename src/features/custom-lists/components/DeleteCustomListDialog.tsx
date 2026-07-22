import { Box, Button, CloseButton, Dialog, Flex, Text } from "@chakra-ui/react"
import { extractApiError } from "@/utils/errors"
import { useDeleteCustomList } from "../hooks/useCustomListMutations"
import type { CustomListItem } from "@/api/customLists"

interface DeleteCustomListDialogProps {
  customList: CustomListItem
  onClose: () => void
}

export function DeleteCustomListDialog({ customList, onClose }: DeleteCustomListDialogProps) {
  const deleteMutation = useDeleteCustomList()

  async function handleDelete() {
    await deleteMutation.mutateAsync(customList.uniqueId)
    onClose()
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(details) => (details.open ? null : onClose())}
      size={{ base: "full", md: "md" }}
    >
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
      <Dialog.Positioner>
        <Dialog.Content
          bg="white"
          borderRadius={{ base: 0, md: "24px" }}
          maxW={{ base: "100vw", md: "520px" }}
          m={{ base: 0, md: "auto" }}
        >
          <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="gray.200">
            <Flex align="flex-start" justify="space-between" gap={4}>
              <Text fontSize="lg" fontWeight="800" color="gray.900">
                Delete custom list
              </Text>
              <Dialog.CloseTrigger asChild>
                <CloseButton aria-label="Close delete confirmation" />
              </Dialog.CloseTrigger>
            </Flex>
          </Box>

          <Dialog.Body px={6} py={6}>
            <Text fontSize="sm" color="gray.700">
              Delete <strong>{customList.name}</strong>? Its {customList.memberCount} member
              {customList.memberCount === 1 ? "" : "s"} will be removed from the list. The members themselves are not
              deleted.
            </Text>

            {deleteMutation.error ? (
              <Box mt={4} p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
                <Text fontSize="sm" fontWeight="700" color="red.700">
                  {extractApiError(deleteMutation.error)}
                </Text>
              </Box>
            ) : null}

            <Flex pt={6} justify="space-between" gap={3} flexWrap="wrap">
              <Button
                variant="outline"
                colorPalette="gray"
                borderRadius="14px"
                h="44px"
                px={6}
                minW={{ base: "full", md: "140px" }}
                onClick={onClose}
              >
                Cancel
              </Button>

              <Button
                colorPalette="red"
                borderRadius="14px"
                h="44px"
                px={6}
                minW={{ base: "full", md: "140px" }}
                disabled={deleteMutation.isPending}
                loading={deleteMutation.isPending}
                loadingText="Deleting..."
                onClick={handleDelete}
              >
                Delete list
              </Button>
            </Flex>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
