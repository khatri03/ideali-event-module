import { Box, Flex, SimpleGrid, Skeleton, SkeletonText, Stack } from "@chakra-ui/react"
import type { ReactNode } from "react"
import type { EventWizardStepSlug } from "../hooks/useEventWizard"

interface EventWizardStepSkeletonProps {
  step: EventWizardStepSlug
}

export function EventWizardStepSkeleton({ step }: EventWizardStepSkeletonProps) {
  switch (step) {
    case "name":
      return <NameSkeleton />
    case "description":
      return <DescriptionSkeleton />
    case "theme-color":
      return <ThemeColorSkeleton />
    case "payment-account":
      return <PaymentAccountSkeleton />
    case "advanced-settings":
      return <PurchaseLimitSkeleton />
    case "time-zone":
      return <TimeZoneSkeleton />
    case "sessions":
      return <SessionsSkeleton />
    case "discount-coupon":
      return <InfoSkeleton titleWidth="160px" />
    case "questions":
      return <InfoSkeleton titleWidth="120px" />
    case "thank-you-email":
      return <InfoSkeleton titleWidth="180px" />
    case "review":
      return <ReviewSkeleton />
    default:
      return <NameSkeleton />
  }
}

function PanelSkeleton({ children }: { children: ReactNode }) {
  return (
    <Stack gap={5}>
      {children}
      <Flex gap={3} justify="space-between" flexWrap="wrap">
        <Skeleton height="44px" flex={1} borderRadius="14px" minW={{ base: "full", md: "160px" }} />
        <Skeleton height="44px" flex={1} borderRadius="14px" minW={{ base: "full", md: "160px" }} />
      </Flex>
    </Stack>
  )
}

function NameSkeleton() {
  return (
    <PanelSkeleton>
      <Stack gap={3}>
        <Skeleton height="18px" width="140px" />
        <Skeleton height="48px" borderRadius="14px" />
      </Stack>
      <SkeletonText noOfLines={2} width="80%" />
    </PanelSkeleton>
  )
}

function DescriptionSkeleton() {
  return (
    <PanelSkeleton>
      <Stack gap={3}>
        <Skeleton height="18px" width="160px" />
        <Skeleton height="180px" borderRadius="16px" />
      </Stack>
      <SkeletonText noOfLines={2} width="75%" />
    </PanelSkeleton>
  )
}

function ThemeColorSkeleton() {
  return (
    <PanelSkeleton>
      <Stack gap={3}>
        <Skeleton height="18px" width="140px" />
        <Flex gap={4} wrap="wrap">
          <Skeleton height="52px" width="52px" borderRadius="16px" />
          <Skeleton height="52px" width="180px" borderRadius="14px" />
        </Flex>
        <Flex gap={3} wrap="wrap">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} height="36px" width="36px" borderRadius="12px" />
          ))}
        </Flex>
      </Stack>
      <SkeletonText noOfLines={1} width="65%" />
    </PanelSkeleton>
  )
}

function PaymentAccountSkeleton() {
  return (
    <PanelSkeleton>
      <Stack gap={3}>
        <Skeleton height="18px" width="180px" />
        <Skeleton height="44px" borderRadius="14px" />
        <SkeletonText noOfLines={2} width="74%" />
      </Stack>
      <Stack gap={3}>
        <Skeleton height="18px" width="150px" />
        <Flex gap={2} wrap="wrap">
          <Skeleton height="28px" width="96px" borderRadius="999px" />
          <Skeleton height="28px" width="96px" borderRadius="999px" />
          <Skeleton height="28px" width="96px" borderRadius="999px" />
        </Flex>
        <SimpleGrid columns={{ base: 1, sm: 2, xl: 3 }} gap={3}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} height="84px" borderRadius="20px" />
          ))}
        </SimpleGrid>
      </Stack>
    </PanelSkeleton>
  )
}

function PurchaseLimitSkeleton() {
  return (
    <PanelSkeleton>
      <Stack gap={3}>
        <Skeleton height="18px" width="200px" />
        <Skeleton height="48px" borderRadius="14px" />
      </Stack>
      <SkeletonText noOfLines={2} width="70%" />
    </PanelSkeleton>
  )
}

function TimeZoneSkeleton() {
  return (
    <PanelSkeleton>
      <Stack gap={3}>
        <Skeleton height="18px" width="120px" />
        <Skeleton height="44px" borderRadius="14px" />
      </Stack>
      <SkeletonText noOfLines={2} width="78%" />
    </PanelSkeleton>
  )
}

function SessionsSkeleton() {
  return (
    <Stack gap={5}>
      <SkeletonText noOfLines={2} width="80%" />
      <Stack gap={4}>
        <Box p={5} borderRadius="20px" border="1px solid" borderColor="gray.200">
          <Stack gap={4}>
            <Skeleton height="18px" width="120px" />
            <Flex gap={4} direction={{ base: "column", md: "row" }}>
              <Skeleton height="48px" flex={1} borderRadius="14px" />
              <Skeleton height="48px" flex={1} borderRadius="14px" />
            </Flex>
            <Skeleton height="48px" borderRadius="14px" />
          </Stack>
        </Box>
      </Stack>
      <Skeleton height="44px" width="150px" borderRadius="14px" />
      <Flex gap={3} justify="space-between" flexWrap="wrap">
        <Skeleton height="44px" flex={1} borderRadius="14px" minW={{ base: "full", md: "160px" }} />
        <Skeleton height="44px" flex={1} borderRadius="14px" minW={{ base: "full", md: "160px" }} />
      </Flex>
    </Stack>
  )
}

function ReviewSkeleton() {
  return (
    <Stack gap={5}>
      <SkeletonText noOfLines={2} width="78%" />
      <Stack gap={3}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Box
            key={index}
            p={4}
            borderRadius="18px"
            border="1px solid"
            borderColor="gray.200"
          >
            <Flex justify="space-between" gap={3} direction={{ base: "column", md: "row" }}>
              <Skeleton height="18px" width="120px" />
              <Skeleton height="18px" width="240px" />
            </Flex>
          </Box>
        ))}
      </Stack>
      <Flex gap={3} justify="space-between" flexWrap="wrap">
        <Skeleton height="44px" flex={1} borderRadius="14px" minW={{ base: "full", md: "160px" }} />
        <Skeleton height="44px" flex={1} borderRadius="14px" minW={{ base: "full", md: "160px" }} />
      </Flex>
    </Stack>
  )
}

function InfoSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <PanelSkeleton>
      <Stack gap={3}>
        <Skeleton height="18px" width={titleWidth} />
        <SkeletonText noOfLines={2} width="80%" />
      </Stack>
      <SkeletonText noOfLines={2} width="70%" />
    </PanelSkeleton>
  )
}
