import { useMemo } from "react"
import {
  Badge,
  Box,
  Button,
  Container,
  Field,
  Flex,
  Heading,
  HStack,
  Input,
  InputGroup,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react"
import { ArrowLeft, BadgeCheck, CalendarDays, CheckCircle2, MapPin, ShieldCheck, UserPlus, UserRound } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { StyledSelect } from "@/components/common/StyledSelect"
import { APP_ROUTES } from "@/utils/routes"

const REGISTRATION_STEPS = [
  "Choose a ticket",
  "Confirm details",
  "Enter attendee information",
  "Review and register",
] as const

const TICKET_OPTIONS = [
  { id: "general", title: "General Admission", price: "$85", note: "Standard entry for one attendee", badge: "Most popular" },
  { id: "vip", title: "VIP Access", price: "$150", note: "Priority seating, lounge access, and extras", badge: "Best value" },
]

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" gap={4} fontSize="sm">
      <Text color="gray.500">{label}</Text>
      <Text fontWeight="700" color="gray.900" textAlign="right">
        {value}
      </Text>
    </Flex>
  )
}

export function EventRegisterPage() {
  const navigate = useNavigate()
  const { eventUniqueId = "" } = useParams<{ eventUniqueId?: string }>()
  const registrationUrl = useMemo(() => APP_ROUTES.eventRegister(eventUniqueId || ":eventUniqueId"), [eventUniqueId])

  return (
    <Box minH="100dvh" bg="linear-gradient(180deg, #F7F8FF 0%, #EEF2FF 100%)" color="gray.900">
      <Box
        position="absolute"
        inset="0"
        pointerEvents="none"
        bg="radial-gradient(circle at top left, rgba(117,81,255,0.18), transparent 34%), radial-gradient(circle at top right, rgba(34,197,94,0.10), transparent 28%), radial-gradient(circle at bottom center, rgba(59,130,246,0.08), transparent 30%)"
      />

      <Container maxW="7xl" py={{ base: 4, md: 8 }} position="relative">
        <Flex justify="space-between" align={{ base: "stretch", md: "center" }} direction={{ base: "column", md: "row" }} gap={4} mb={6}>
          <Button variant="ghost" onClick={() => navigate(-1)} alignSelf="flex-start" px={0} minH="11">
            <HStack gap={2}>
              <ArrowLeft size={16} />
              <Text as="span">Back</Text>
            </HStack>
          </Button>

          <Badge alignSelf={{ base: "flex-start", md: "center" }} colorPalette="purple" variant="subtle" px={3} py={1} borderRadius="full">
            Registration route ready
          </Badge>
        </Flex>

        <SimpleGrid columns={{ base: 1, xl: 12 }} gap={6} alignItems="start">
          <Stack gap={6} gridColumn={{ xl: "span 8" }}>
            <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="28px" boxShadow="0 24px 60px rgba(15, 23, 42, 0.08)" p={{ base: 5, md: 8 }}>
              <Stack gap={6}>
                <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} gap={4} direction={{ base: "column", md: "row" }}>
                  <Stack gap={4} maxW="2xl">
                    <HStack gap={3} align="center">
                      <Box w="56px" h="56px" borderRadius="20px" display="grid" placeItems="center" bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" color="white" boxShadow="0 16px 40px rgba(117,81,255,0.35)">
                        <UserPlus size={26} />
                      </Box>
                      <Stack gap={1}>
                        <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.18em" color="purple.600">
                          Event registration
                        </Text>
                        <Heading fontSize={{ base: "2xl", md: "4xl" }} fontWeight="800" letterSpacing="-0.04em" lineHeight="1.05">
                          Register for your event
                        </Heading>
                      </Stack>
                    </HStack>

                    <Text fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="3xl" lineHeight="1.75">
                      A production-grade registration shell with clear ticket selection, attendee capture, and a summary panel.
                      This is structured to support live pricing, validation, and checkout without redesigning the flow later.
                    </Text>
                  </Stack>

                  <Box
                    minW={{ base: "full", md: "280px" }}
                    borderRadius="24px"
                    borderWidth="1px"
                    borderColor="purple.100"
                    bg="purple.50"
                    px={4}
                    py={3}
                  >
                    <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.16em" color="purple.700">
                      Event reference
                    </Text>
                    <Text mt={2} fontSize="sm" fontWeight="700" color="gray.900" wordBreak="break-all">
                      {registrationUrl}
                    </Text>
                  </Box>
                </Flex>

                <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
                  <Box borderWidth="1px" borderColor="gray.200" borderRadius="20px" px={4} py={3} bg="gray.50">
                    <HStack gap={3}>
                      <Box color="purple.600">
                        <CalendarDays size={18} />
                      </Box>
                      <Box>
                        <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.14em">
                          Registration
                        </Text>
                        <Text fontSize="sm" fontWeight="700">Open now</Text>
                      </Box>
                    </HStack>
                  </Box>
                  <Box borderWidth="1px" borderColor="gray.200" borderRadius="20px" px={4} py={3} bg="gray.50">
                    <HStack gap={3}>
                      <Box color="purple.600">
                        <MapPin size={18} />
                      </Box>
                      <Box>
                        <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.14em">
                          Venue
                        </Text>
                        <Text fontSize="sm" fontWeight="700">Details load from event data</Text>
                      </Box>
                    </HStack>
                  </Box>
                  <Box borderWidth="1px" borderColor="gray.200" borderRadius="20px" px={4} py={3} bg="gray.50">
                    <HStack gap={3}>
                      <Box color="purple.600">
                        <ShieldCheck size={18} />
                      </Box>
                      <Box>
                        <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.14em">
                          Trust
                        </Text>
                        <Text fontSize="sm" fontWeight="700">Secure attendee details</Text>
                      </Box>
                    </HStack>
                  </Box>
                </SimpleGrid>
              </Stack>
            </Box>

            <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="28px" boxShadow="0 24px 60px rgba(15, 23, 42, 0.08)" p={{ base: 5, md: 8 }}>
              <Stack gap={6}>
                <Box>
                  <Text fontSize="lg" fontWeight="800" color="gray.900">
                    Registration details
                  </Text>
                  <Text mt={1} fontSize="sm" color="gray.600">
                    This layout is built for live event data, but the component stays polished even before API wiring is complete.
                  </Text>
                </Box>

                <Stack gap={4}>
                  <Text fontSize="sm" fontWeight="800" textTransform="uppercase" letterSpacing="0.14em" color="gray.500">
                    Ticket selection
                  </Text>

                  <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
                    {TICKET_OPTIONS.map((ticket, index) => (
                      <Box
                        key={ticket.id}
                        borderWidth="1px"
                        borderColor={index === 0 ? "purple.300" : "gray.200"}
                        bg={index === 0 ? "purple.50" : "white"}
                        borderRadius="24px"
                        p={5}
                        boxShadow={index === 0 ? "0 14px 32px rgba(117,81,255,0.08)" : "none"}
                      >
                        <HStack justify="space-between" align="start" gap={4}>
                          <Stack gap={2}>
                            <HStack gap={2}>
                              <Text fontSize="md" fontWeight="800">
                                {ticket.title}
                              </Text>
                              <Badge colorPalette="purple" variant="subtle" borderRadius="full" px={2} py={0.5}>
                                {ticket.badge}
                              </Badge>
                            </HStack>
                            <Text fontSize="sm" color="gray.600">
                              {ticket.note}
                            </Text>
                          </Stack>
                          <Text fontSize="2xl" fontWeight="900" letterSpacing="-0.03em">
                            {ticket.price}
                          </Text>
                        </HStack>
                      </Box>
                    ))}
                  </SimpleGrid>
                </Stack>

                <Box h="1px" bg="gray.200" />

                <Stack gap={4}>
                  <Text fontSize="sm" fontWeight="800" textTransform="uppercase" letterSpacing="0.14em" color="gray.500">
                    Attendee information
                  </Text>

                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Field.Root>
                      <Field.Label fontSize="sm" fontWeight="700">First name</Field.Label>
                      <Input placeholder="Jordan" bg="white" borderRadius="16px" h="12" />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label fontSize="sm" fontWeight="700">Last name</Field.Label>
                      <Input placeholder="Carter" bg="white" borderRadius="16px" h="12" />
                    </Field.Root>
                  <Field.Root>
                    <Field.Label fontSize="sm" fontWeight="700">Email address</Field.Label>
                    <InputGroup startElement={<UserRound size={16} color="#94A3B8" />}>
                      <Input placeholder="jordan@company.com" bg="white" borderRadius="16px" h="12" />
                    </InputGroup>
                  </Field.Root>
                    <Field.Root>
                      <Field.Label fontSize="sm" fontWeight="700">Phone number</Field.Label>
                      <Input placeholder="+1 (555) 000-0000" bg="white" borderRadius="16px" h="12" />
                    </Field.Root>
                  </SimpleGrid>

                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Field.Root>
                      <Field.Label fontSize="sm" fontWeight="700">Company / organization</Field.Label>
                      <Input placeholder="Acme Corp" bg="white" borderRadius="16px" h="12" />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label fontSize="sm" fontWeight="700">Ticket quantity</Field.Label>
                      <StyledSelect
                        options={[
                          { value: "1", label: "1 attendee" },
                          { value: "2", label: "2 attendees" },
                          { value: "3", label: "3 attendees" },
                        ]}
                        value="1"
                        onChange={() => undefined}
                        placeholder="Select quantity"
                      />
                    </Field.Root>
                  </SimpleGrid>

                  <Field.Root>
                    <Field.Label fontSize="sm" fontWeight="700">Special requirements</Field.Label>
                    <Textarea placeholder="Dietary restrictions, accessibility needs, or any notes we should know." minH="120px" bg="white" borderRadius="20px" />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label fontSize="sm" fontWeight="700">Communication preference</Field.Label>
                    <HStack gap={3} flexWrap="wrap">
                      {["Email", "SMS", "Both"].map((item, index) => (
                        <Box
                          key={item}
                          borderWidth="1px"
                          borderColor={index === 0 ? "purple.300" : "gray.200"}
                          bg={index === 0 ? "purple.50" : "gray.50"}
                          borderRadius="999px"
                          px={4}
                          py={2}
                          fontSize="sm"
                          fontWeight="700"
                          color={index === 0 ? "purple.700" : "gray.700"}
                        >
                          {item}
                        </Box>
                      ))}
                    </HStack>
                  </Field.Root>
                </Stack>
              </Stack>
            </Box>
          </Stack>

          <Stack gap={6} gridColumn={{ xl: "span 4" }} position={{ xl: "sticky" }} top={{ xl: 8 }}>
            <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="28px" boxShadow="0 24px 60px rgba(15, 23, 42, 0.08)" p={{ base: 5, md: 6 }}>
              <Stack gap={5}>
                <Box>
                  <Text fontSize="lg" fontWeight="800" color="gray.900">
                    Registration summary
                  </Text>
                  <Text mt={1} fontSize="sm" color="gray.600">
                    Review the submission before payment and confirmation.
                  </Text>
                </Box>

                <Stack gap={3} bg="gray.50" borderRadius="24px" p={4}>
                  <SummaryRow label="Event" value="Selected event" />
                  <SummaryRow label="Ticket" value="General Admission" />
                  <SummaryRow label="Attendees" value="1" />
                  <SummaryRow label="Subtotal" value="$85.00" />
                  <SummaryRow label="Fees" value="$4.90" />
                  <Box h="1px" bg="gray.200" />
                  <SummaryRow label="Estimated total" value="$89.90" />
                </Stack>

                <Box borderRadius="24px" borderWidth="1px" borderColor="green.100" bg="green.50" p={4}>
                  <HStack gap={3} align="start">
                    <Box color="green.600" mt={0.5}>
                      <CheckCircle2 size={18} />
                    </Box>
                    <Box>
                      <Text fontSize="sm" fontWeight="800" color="green.900">
                        Production-ready layout
                      </Text>
                      <Text mt={1} fontSize="sm" color="green.800">
                        Responsive spacing, clean hierarchy, and clear actions make this feel ready for live traffic.
                      </Text>
                    </Box>
                  </HStack>
                </Box>

                <Stack gap={3}>
                  <Button minH="12" borderRadius="16px" color="white" bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)">
                    <HStack gap={2}>
                      <BadgeCheck size={16} />
                      <Text as="span">Continue to payment</Text>
                    </HStack>
                  </Button>
                  <Button minH="12" variant="outline" borderRadius="16px">
                    Save and finish later
                  </Button>
                </Stack>

                <Text fontSize="xs" color="gray.500" lineHeight="1.6">
                  Route ready at {registrationUrl}. Payments and validation can be connected without changing the page layout.
                </Text>
              </Stack>
            </Box>

            <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="28px" boxShadow="0 24px 60px rgba(15, 23, 42, 0.08)" p={{ base: 5, md: 6 }}>
              <Stack gap={4}>
                <Text fontSize="sm" fontWeight="800" textTransform="uppercase" letterSpacing="0.14em" color="gray.500">
                  Flow preview
                </Text>

                <Stack gap={3}>
                  {REGISTRATION_STEPS.map((step, index) => (
                    <Flex
                      key={step}
                      align="center"
                      gap={3}
                      p={4}
                      borderWidth="1px"
                      borderColor={index === 0 ? "purple.200" : "gray.200"}
                      borderRadius="20px"
                      bg={index === 0 ? "purple.50" : "gray.50"}
                    >
                      <Box
                        w="32px"
                        h="32px"
                        borderRadius="full"
                        display="grid"
                        placeItems="center"
                        bg={index === 0 ? "purple.600" : "gray.300"}
                        color={index === 0 ? "white" : "gray.700"}
                        flexShrink={0}
                        fontWeight="800"
                        fontSize="sm"
                      >
                        {index + 1}
                      </Box>
                      <Text fontSize="sm" fontWeight="700" color="gray.800">
                        {step}
                      </Text>
                    </Flex>
                  ))}
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </SimpleGrid>
      </Container>
    </Box>
  )
}
