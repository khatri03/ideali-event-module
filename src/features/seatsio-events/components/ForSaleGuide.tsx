import { useId, useState, type ReactNode } from "react"
import { Box, Button, Flex, HStack, SimpleGrid, Text } from "@chakra-ui/react"
import { CheckCircle2, ChevronDown, HelpCircle, ListChecks, MousePointerClick } from "lucide-react"

interface GuideStep {
  icon: ReactNode
  title: string
  detail: string
}

const OFF_SALE_STEPS: GuideStep[] = [
  {
    icon: <MousePointerClick size={16} />,
    title: "Pick objects on the map",
    detail: "Click any on-sale seat, table or area. Each pick turns purple and is staged — sold and off-sale objects can't be picked.",
  },
  {
    icon: <ListChecks size={16} />,
    title: "Review the staged list",
    detail: "Your picks gather in the bar below the map. Deselect any you didn't mean to include before applying.",
  },
  {
    icon: <CheckCircle2 size={16} />,
    title: "Apply to take off sale",
    detail: "Confirm the change. Buyers can no longer buy those objects until you put them back on sale.",
  },
]

function StepCard({ step, index }: { step: GuideStep; index: number }) {
  return (
    <Box
      position="relative"
      h="full"
      borderRadius="12px"
      border="1px solid"
      borderColor="border.subtle"
      bg="bg.subtle"
      px={4}
      py={4}
      pt={5}
    >
      <Flex
        align="center"
        justify="center"
        position="absolute"
        top="-13px"
        left={4}
        w="26px"
        h="26px"
        borderRadius="full"
        bg="brand.500"
        color="white"
        fontSize="xs"
        fontWeight="800"
      >
        {index + 1}
      </Flex>
      <HStack gap={2} color="text.primary" mb={1}>
        <Box color="brand.500" flexShrink={0}>
          {step.icon}
        </Box>
        <Text fontSize="sm" fontWeight="700">
          {step.title}
        </Text>
      </HStack>
      <Text fontSize="xs" color="text.secondary">
        {step.detail}
      </Text>
    </Box>
  )
}

/**
 * The numbered walkthrough for taking objects off sale. It spells out the pick → review → apply flow so an organizer
 * who has never used the seat map knows exactly what each step does before they touch it.
 */
export function ForSaleGuide() {
  const [isExpanded, setIsExpanded] = useState(false)
  const contentId = useId()

  return (
    <Box
      borderRadius="16px"
      border="1px solid"
      borderColor="border.subtle"
      bg="card.bg"
      px={{ base: 4, md: 5 }}
      py={{ base: 2, md: 3 }}
    >
      <Button
        variant="ghost"
        w="full"
        justifyContent="space-between"
        minH="11"
        px={0}
        cursor="pointer"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={() => setIsExpanded((value) => !value)}
      >
        <HStack gap={2} color="text.primary">
          <Box color="brand.500" flexShrink={0}>
            <HelpCircle size={18} aria-hidden="true" />
          </Box>
          <Text fontSize="sm" fontWeight="800">
            How to take objects off sale
          </Text>
        </HStack>
        <ChevronDown
          size={18}
          aria-hidden="true"
          style={{
            transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.16s ease",
          }}
        />
      </Button>

      <Box
        id={contentId}
        display="grid"
        gridTemplateRows={isExpanded ? "1fr" : "0fr"}
        transition="grid-template-rows 0.22s ease"
        inert={!isExpanded ? true : undefined}
      >
        <Box overflow="hidden" minH={0}>
          <Box pt={{ base: 3, md: 4 }} pb={{ base: 2, md: 3 }}>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={{ base: 5, md: 4 }}>
              {OFF_SALE_STEPS.map((step, index) => (
                <StepCard key={step.title} step={step} index={index} />
              ))}
            </SimpleGrid>
            <Text mt={{ base: 4, md: 5 }} fontSize="xs" color="text.secondary">
              Tip: hover any seat to see its status — <Text as="span" fontWeight="700">Sold</Text> or{" "}
              <Text as="span" fontWeight="700">Not for sale</Text>.
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
