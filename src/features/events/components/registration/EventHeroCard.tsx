import type { ReactNode } from "react"
import { Box, Flex, HStack, Heading, Link, SimpleGrid, Stack, Text } from "@chakra-ui/react"
import { CalendarDays, ChevronRight, ExternalLink, MapPin } from "lucide-react"
import { AutoImageCarousel } from "@/features/events/components/registration/AutoImageCarousel"
import type { getSessionBannerSlides } from "@/features/events/utils/ticketSelection"
import { formatRegistrationDateTime } from "@/features/events/utils/registrationFormat"

interface EventHeroCardProps {
  title: string
  organizer: string
  summary: string | null
  startDate: string | null
  endDate: string | null
  location: string
  locationMapUrl: string | null
  bannerSlides: ReturnType<typeof getSessionBannerSlides>
  accentColor: string
}

function HeroFact({
  icon,
  label,
  children,
  hasDivider,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
  hasDivider: boolean
}) {
  return (
    <HStack
      gap={3}
      align="start"
      px={4}
      py={3}
      borderBottomWidth={hasDivider ? "1px" : "0"}
      borderBottomColor="gray.200"
    >
      <Box color="gray.500" mt={0.5}>
        {icon}
      </Box>
      <Box>
        <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
          {label}
        </Text>
        {children}
      </Box>
    </HStack>
  )
}

function FactValue({ children }: { children: ReactNode }) {
  return (
    <Text mt={1} fontSize="sm" fontWeight="700" color="gray.900">
      {children}
    </Text>
  )
}

/** The banner and headline facts shown above the wizard, on every step. */
export function EventHeroCard({
  title,
  organizer,
  summary,
  startDate,
  endDate,
  location,
  locationMapUrl,
  bannerSlides,
  accentColor,
}: EventHeroCardProps) {
  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="blackAlpha.100"
      borderRadius="28px"
      overflow="hidden"
      boxShadow="0 24px 60px rgba(15, 23, 42, 0.08)"
    >
      <Box h="6px" bg={accentColor} />
      <Box p={{ base: 4, md: 6 }}>
        <SimpleGrid columns={{ base: 1, lg: 12 }} gap={6} alignItems="stretch">
          <Box
            gridColumn={{ lg: "span 8" }}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="24px"
            overflow="hidden"
            bg="gray.100"
          >
            {bannerSlides.length > 0 ? (
              <AutoImageCarousel slides={bannerSlides} accentColor={accentColor} />
            ) : (
              <Flex minH={{ base: "220px", md: "320px" }} align="center" justify="center" px={6} textAlign="center">
                <Text fontSize="sm" fontWeight="700" color="gray.500">
                  Banner not available
                </Text>
              </Flex>
            )}
          </Box>

          <Box
            gridColumn={{ lg: "span 4" }}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="24px"
            bg="white"
            p={{ base: 5, md: 6 }}
          >
            <Stack gap={4} h="full" justify="space-between">
              <Stack gap={3}>
                <Heading
                  fontSize={{ base: "2xl", md: "3xl" }}
                  lineHeight="1.08"
                  letterSpacing="-0.04em"
                  color="gray.900"
                >
                  {title}
                </Heading>
                <Text fontSize={{ base: "sm", md: "md" }} color="gray.700" lineHeight="1.7">
                  <Text as="span" fontWeight="400">
                    By:
                  </Text>{" "}
                  <Text as="span" fontWeight="700" color="gray.900">
                    {organizer}
                  </Text>
                </Text>
                {summary ? (
                  <Text fontSize="sm" color="gray.600" lineHeight="1.7">
                    {summary}
                  </Text>
                ) : null}
              </Stack>

              <Stack gap={3}>
                <Box borderWidth="1px" borderColor="gray.200" borderRadius="20px" bg="gray.50" overflow="hidden">
                  <HeroFact icon={<CalendarDays size={18} />} label="Starts At" hasDivider>
                    <FactValue>{formatRegistrationDateTime(startDate)}</FactValue>
                  </HeroFact>
                  <HeroFact icon={<ChevronRight size={18} />} label="Ends At" hasDivider>
                    <FactValue>{formatRegistrationDateTime(endDate)}</FactValue>
                  </HeroFact>
                  <HeroFact icon={<MapPin size={18} />} label="Venue" hasDivider={false}>
                    {locationMapUrl ? (
                      <Link
                        href={locationMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        mt={1}
                        display="inline-flex"
                        alignItems="center"
                        gap={1.5}
                        fontSize="sm"
                        fontWeight="700"
                        color={accentColor}
                        textDecoration="underline"
                        textUnderlineOffset="3px"
                        title="Open venue location in a new tab"
                      >
                        {location}
                        <ExternalLink size={14} />
                      </Link>
                    ) : (
                      <FactValue>{location}</FactValue>
                    )}
                  </HeroFact>
                </Box>
              </Stack>
            </Stack>
          </Box>
        </SimpleGrid>
      </Box>
    </Box>
  )
}
