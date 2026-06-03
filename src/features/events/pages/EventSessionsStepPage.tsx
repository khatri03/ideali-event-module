import { useEffect, useRef, useState } from "react"
import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  Input,
  Skeleton,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@chakra-ui/react"
import { PencilLine, Plus, Sparkles, Settings2 } from "lucide-react"
import { useParams } from "react-router-dom"
import { useCreateEventWizardSession, useEventWizardSessions } from "../hooks/useEventWizardSessions"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"

export function EventSessionsStepPage() {
  const { eventId } = useParams<{ eventId?: string }>()
  const [isOpen, setIsOpen] = useState(false)
  const [sessionName, setSessionName] = useState("")
  const [sessionNameError, setSessionNameError] = useState("")
  const sessionNameInputRef = useRef<HTMLInputElement>(null)
  const { sessions, isLoading, isError, error, refetch } = useEventWizardSessions(eventId)
  const createSessionMutation = useCreateEventWizardSession(eventId)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      sessionNameInputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [isOpen])

  async function handleCreateSession(navigateToWizard = false) {
    const trimmedName = sessionName.trim()
    if (!trimmedName) {
      setSessionNameError("Session name is required.")
      return
    }

    setSessionNameError("")
    try {
      const createdSession = await createSessionMutation.mutateAsync({ name: trimmedName })
      await refetch()
      setSessionName("")
      setIsOpen(false)
      if (navigateToWizard) {
        window.open(
          APP_ROUTES.sessionWizard.editStep(
            createdSession.uniqueId,
            APP_ROUTES.sessionWizard.slugs.description,
          ),
          "_blank",
          "noopener,noreferrer",
        )
      }
    } catch (mutationError: unknown) {
      setSessionNameError(extractApiError(mutationError))
    }
  }

  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Text fontSize="sm" fontWeight="700" color="text.primary">
          Sessions
        </Text>
        <Text fontSize="sm" color="text.secondary">
          Quick Add creates a session and refreshes the list. Edit opens the session wizard.
        </Text>

        <Tooltip.Root openDelay={300} closeDelay={100}>
          <Tooltip.Trigger asChild>
            <Button
              variant="outline"
              aria-label="Add session"
              borderRadius="999px"
              h="44px"
              w="44px"
              minW="44px"
              p={0}
              alignSelf="flex-end"
              onClick={() => setIsOpen(true)}
            >
              <Plus size={18} />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Positioner>
            <Tooltip.Content>Quick add session</Tooltip.Content>
          </Tooltip.Positioner>
        </Tooltip.Root>

        <Box overflowX="auto" borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="app.bg">
          <Table.Root variant="line" size="sm">
            <Table.Header>
              <Table.Row bg="app.bg">
                <Table.ColumnHeader px={6} py={3} fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em">
                  Session name
                </Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3} textAlign="right" fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em">
                  Action
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Table.Row key={`session-skeleton-${index}`} borderColor="border.subtle">
                    <Table.Cell px={6} py={4}>
                      <Skeleton h="16px" maxW="200px" />
                    </Table.Cell>
                    <Table.Cell px={4} py={4} textAlign="right">
                      <Skeleton h="36px" w="36px" borderRadius="full" ml="auto" />
                    </Table.Cell>
                  </Table.Row>
                ))
              ) : sessions.length > 0 ? (
                sessions.map((session) => (
                  <Table.Row key={session.uniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s" borderColor="border.subtle">
                    <Table.Cell px={6} py={4}>
                      <Text fontSize="sm" fontWeight="600" color="text.primary" lineClamp={1}>
                        {session.name}
                      </Text>
                    </Table.Cell>
                    <Table.Cell px={4} py={4} textAlign="right">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Edit ${session.name}`}
                        borderRadius="full"
                        h="44px"
                        w="44px"
                        minH="44px"
                        minW="44px"
                        px={0}
                        borderColor="border.subtle"
                        bg="white"
                        onClick={() => {
                          window.open(APP_ROUTES.sessionWizard.edit(session.uniqueId), "_blank", "noopener,noreferrer")
                        }}
                      >
                        <PencilLine size={16} />
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))
              ) : (
                <Table.Row borderColor="border.subtle">
                  <Table.Cell px={6} py={6} colSpan={2}>
                    <Text fontSize="sm" color="text.secondary">
                      No sessions added yet.
                    </Text>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        </Box>

        {isError ? (
          <Text fontSize="sm" color="red.500">
            {error || "Failed to load sessions."}
          </Text>
        ) : null}
      </Stack>

      <Dialog.Root
        open={isOpen}
        onOpenChange={(details) => {
          setIsOpen(details.open)
          if (!details.open) {
            setSessionName("")
            setSessionNameError("")
          }
        }}
        size="lg"
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "560px" }}
            maxH={{ base: "100dvh", md: "90vh" }}
            m={{ base: 0, md: "auto" }}
            overflow="hidden"
            display="flex"
            flexDirection="column"
          >
            <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="gray.200">
              <Flex align="flex-start" justify="space-between" gap={4}>
                <Flex align="center" gap={3}>
                  <Flex
                    w="42px"
                    h="42px"
                    borderRadius="14px"
                    align="center"
                    justify="center"
                    bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)"
                    boxShadow="0 12px 30px rgba(66, 42, 251, 0.25)"
                    flexShrink={0}
                  >
                    <Sparkles size={20} color="white" fill="white" />
                  </Flex>
                  <Box>
                    <Text fontSize="lg" fontWeight="800" color="gray.900">
                      Add session
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      Enter a session name and quick add it to the list.
                    </Text>
                  </Box>
                </Flex>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close session modal" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              <Stack gap={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
                    Session name
                  </Text>
                  <Input
                    ref={sessionNameInputRef}
                    value={sessionName}
                    onChange={(event) => {
                      setSessionName(event.target.value)
                      if (sessionNameError) {
                        setSessionNameError("")
                      }
                    }}
                    placeholder="Keynote, workshop, networking..."
                    border="1px solid"
                    borderColor="secondaryGray.100"
                    borderRadius="14px"
                    h="44px"
                    px={4}
                    w="full"
                    _focusVisible={{
                      borderColor: "brand.400",
                      boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)",
                      outline: "none",
                    }}
                  />
                  {sessionNameError ? (
                    <Text mt={2} fontSize="sm" color="red.500">
                      {sessionNameError}
                    </Text>
                  ) : null}
                </Box>

                <Flex
                  pt={5}
                  borderTop="1px solid"
                  borderColor="gray.200"
                  align="center"
                  justify="space-between"
                  gap={3}
                  flexWrap="wrap"
                >
                  <Button
                    variant="outline"
                    colorPalette="gray"
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "140px" }}
                    _hover={{ bg: "gray.50", borderColor: "gray.300" }}
                    onClick={() => {
                      setIsOpen(false)
                    }}
                  >
                    Close
                  </Button>

                  <Flex gap={3} flexWrap="wrap" ml="auto">
                    <Button
                      variant="outline"
                      borderRadius="14px"
                      h="44px"
                      px={6}
                      minW={{ base: "full", md: "140px" }}
                      onClick={() => handleCreateSession(false)}
                      loading={createSessionMutation.isPending}
                    >
                      <Sparkles size={16} />
                      Quick Add
                    </Button>

                    <Button
                      borderRadius="14px"
                      h="44px"
                      px={6}
                      minW={{ base: "full", md: "140px" }}
                      onClick={() => handleCreateSession(true)}
                      loading={createSessionMutation.isPending}
                      color="white"
                      style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                    >
                      <Settings2 size={16} />
                      Add & Configure
                    </Button>
                  </Flex>
                </Flex>
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Stack>
  )
}
