import { useState } from "react"
import { HStack, Image, Text } from "@chakra-ui/react"

interface OrganizerBylineProps {
  organizer: string
  logoUrl: string | null
}

/**
 * Who is running the event: the organizer's own logo beside "By: name". A missing or unloadable
 * logo drops out and leaves the name alone, rather than leaving a broken-image box in the header.
 */
export function OrganizerByline({ organizer, logoUrl }: OrganizerBylineProps) {
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null)
  const canShowLogo = Boolean(logoUrl) && logoUrl !== failedLogoUrl

  return (
    <HStack gap={3} align="center">
      {canShowLogo ? (
        <Image
          src={logoUrl ?? undefined}
          alt={`${organizer} logo`}
          boxSize="40px"
          flexShrink={0}
          objectFit="contain"
          borderRadius="full"
          borderWidth="1px"
          borderColor="gray.200"
          bg="white"
          onError={() => setFailedLogoUrl(logoUrl)}
        />
      ) : null}
      <Text fontSize={{ base: "sm", md: "md" }} color="gray.700" lineHeight="1.7" minW={0}>
        <Text as="span" fontWeight="400">
          By:
        </Text>{" "}
        <Text as="span" fontWeight="700" color="gray.900" overflowWrap="anywhere">
          {organizer}
        </Text>
      </Text>
    </HStack>
  )
}
