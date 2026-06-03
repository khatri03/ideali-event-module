import { useState } from "react"
import { Badge, Box, Button, CloseButton, Dialog, Field, Flex, Grid, Input, Stack, Text, Tooltip } from "@chakra-ui/react"
import { Plus, Sparkles, Settings2 } from "lucide-react"
import { StepFieldLabel } from "../components/StepFieldLabel"

export function EventSessionsStepPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [sessionName, setSessionName] = useState("")
  const [sessions, setSessions] = useState<string[]>([])

  function handleAddSession() {
    const trimmedName = sessionName.trim()
    if (!trimmedName) {
      return
    }

    setSessions((current) => [...current, trimmedName])
    setSessionName("")
    setIsOpen(false)
  }

  function handleAddAndConfigure() {
    handleAddSession()
  }

  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Field.Root>
          <StepFieldLabel label="Sessions" />
          <Text fontSize="sm" color="text.secondary">
            Add sessions locally for now. No backend calls are made yet.
          </Text>
        </Field.Root>

        <Tooltip.Root openDelay={250}>
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
            <Tooltip.Content>Add session</Tooltip.Content>
          </Tooltip.Positioner>
        </Tooltip.Root>

        <Box p={4} borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="app.bg">
          <Stack gap={3}>
            <Text fontSize="sm" fontWeight="700" color="text.primary">
              Added sessions
            </Text>
            {sessions.length > 0 ? (
              <Stack gap={2}>
                {sessions.map((name, index) => (
                  <Flex key={`${name}-${index}`} align="center" justify="space-between" gap={3}>
                    <Text fontSize="sm" color="text.secondary">
                      {name}
                    </Text>
                    <Badge borderRadius="999px" px={2} py={1} colorPalette="blue" variant="subtle">
                      Local only
                    </Badge>
                  </Flex>
                ))}
              </Stack>
            ) : (
              <Text fontSize="sm" color="text.secondary">
                No sessions added yet.
              </Text>
            )}
          </Stack>
        </Box>
      </Stack>

      <Dialog.Root
        open={isOpen}
        onOpenChange={(details) => {
          setIsOpen(details.open)
          if (!details.open) {
            setSessionName("")
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
                      Enter a session name and choose how to continue.
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
                <Field.Root>
                  <Field.Label fontSize="sm" fontWeight="600" color="gray.700">
                    Session Name
                  </Field.Label>
                  <Input
                    value={sessionName}
                    onChange={(event) => setSessionName(event.target.value)}
                    placeholder="Keynote, workshop, networking..."
                    borderRadius="14px"
                    h="44px"
                    px={4}
                  />
                </Field.Root>

                <Grid templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }} gap={3}>
                  <Button
                    variant="outline"
                    borderRadius="14px"
                    h="44px"
                    w="full"
                    onClick={() => {
                      setIsOpen(false)
                      setSessionName("")
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="outline"
                    borderRadius="14px"
                    h="44px"
                    w="full"
                    onClick={handleAddSession}
                    disabled={!sessionName.trim()}
                  >
                    <Sparkles size={16} />
                    Quick Add
                  </Button>

                  <Button
                    borderRadius="14px"
                    h="44px"
                    w="full"
                    onClick={handleAddAndConfigure}
                    disabled={!sessionName.trim()}
                    color="white"
                    style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                  >
                    <Settings2 size={16} />
                    Add & Configure
                  </Button>
                </Grid>
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Stack>
  )
}
