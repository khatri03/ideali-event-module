import { Box, Button, Flex, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react"
import { ArrowLeft, BadgeCheck, CalendarDays, MapPin, Ticket, UserPlus } from "lucide-react"
import { useParams, useNavigate } from "react-router-dom"
import { APP_ROUTES } from "@/utils/routes"

const REGISTRATION_STEPS = [
  "Choose a ticket type",
  "Review event details",
  "Complete attendee information",
  "Confirm your registration",
]

export function EventRegisterPage() {
  const navigate = useNavigate()
  const { eventUniqueId = "" } = useParams<{ eventUniqueId?: string }>()

  return (
    <Box minH="100dvh" bg="linear-gradient(180deg, #F7F8FF 0%, #EEF2FF 100%)" py={{ base: 4, md: 10 }} px={{ base: 4, md: 6 }}>
      <Box maxW="6xl" mx="auto">
        <Button
          variant="ghost"
          minH="11"
          px={0}
          mb={6}
          onClick={() => navigate(-1)}
        >
          <Flex align="center" gap={2}>
            <ArrowLeft size={16} />
            <Text as="span">Back</Text>
          </Flex>
        </Button>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} alignItems="start">
          <Box
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="24px"
            boxShadow="0 24px 60px rgba(15, 23, 42, 0.08)"
            p={{ base: 5, md: 8 }}
          >
            <Stack gap={4}>
              <Box
                w="52px"
                h="52px"
                borderRadius="18px"
                display="grid"
                placeItems="center"
                bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)"
                color="white"
              >
                <UserPlus size={24} />
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="800" textTransform="uppercase" letterSpacing="0.12em" color="gray.500">
                  Event registration
                </Text>
                <Heading fontSize={{ base: "2xl", md: "4xl" }} fontWeight="800" letterSpacing="-0.04em" color="gray.900" mt={2}>
                  Register for your event
                </Heading>
                <Text mt={3} fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="xl">
                  This page is in place and ready for the registration workflow wiring. We’ll plug in live event data and the
                  checkout flow next.
                </Text>
              </Box>

              <Stack gap={3}>
                <Flex align="center" gap={3}>
                  <Box color="gray.500">
                    <CalendarDays size={16} />
                  </Box>
                  <Text fontSize="sm" color="gray.700" fontWeight="600">
                    Event unique id: <Box as="span" fontFamily="mono">{eventUniqueId || "pending"}</Box>
                  </Text>
                </Flex>
                <Flex align="center" gap={3}>
                  <Box color="gray.500">
                    <MapPin size={16} />
                  </Box>
                  <Text fontSize="sm" color="gray.700" fontWeight="600">
                    Venue and schedule will be loaded here soon
                  </Text>
                </Flex>
                <Flex align="center" gap={3}>
                  <Box color="gray.500">
                    <Ticket size={16} />
                  </Box>
                  <Text fontSize="sm" color="gray.700" fontWeight="600">
                    Ticket selection will be wired to the event module
                  </Text>
                </Flex>
              </Stack>
            </Stack>
          </Box>

          <Box
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="24px"
            boxShadow="0 24px 60px rgba(15, 23, 42, 0.08)"
            p={{ base: 5, md: 8 }}
          >
            <Stack gap={5}>
              <Box>
                <Text fontSize="lg" fontWeight="800" color="gray.900">
                  Registration flow placeholder
                </Text>
                <Text mt={1} fontSize="sm" color="gray.600">
                  This component is intentionally static for now. It will soon receive the real event registration experience.
                </Text>
              </Box>

              <Stack gap={3}>
                {REGISTRATION_STEPS.map((step, index) => (
                  <Flex
                    key={step}
                    align="center"
                    gap={3}
                    p={4}
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="18px"
                    bg={index === 0 ? "brand.50" : "gray.50"}
                  >
                    <Box
                      w="28px"
                      h="28px"
                      borderRadius="full"
                      display="grid"
                      placeItems="center"
                      bg={index === 0 ? "brand.500" : "gray.300"}
                      color={index === 0 ? "white" : "gray.700"}
                      flexShrink={0}
                    >
                      {index + 1}
                    </Box>
                    <Text fontSize="sm" fontWeight="600" color="gray.800">
                      {step}
                    </Text>
                  </Flex>
                ))}
              </Stack>

              <Flex direction={{ base: "column", sm: "row" }} gap={3} pt={2}>
                <Button
                  w={{ base: "full", sm: "auto" }}
                  minH="11"
                  variant="outline"
                  borderRadius="14px"
                >
                  Save draft
                </Button>
                <Button
                  w={{ base: "full", sm: "auto" }}
                  minH="11"
                  borderRadius="14px"
                  color="white"
                  bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)"
                >
                  <Flex align="center" gap={2}>
                    <BadgeCheck size={16} />
                    <Text as="span">Register now</Text>
                  </Flex>
                </Button>
              </Flex>

              <Text fontSize="xs" color="gray.500">
                Route ready at {APP_ROUTES.eventRegister(eventUniqueId || ":eventUniqueId")}
              </Text>
            </Stack>
          </Box>
        </SimpleGrid>
      </Box>
    </Box>
  )
}
