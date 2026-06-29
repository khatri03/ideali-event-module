import { ArrowLeft, CalendarPlus, Sparkles } from "lucide-react"
import { Box, Button, Flex, Heading, Stack, Text } from "@chakra-ui/react"
import { useNavigate } from "react-router-dom"
import { APP_ROUTES } from "@/utils/routes"

export function SessionListPage() {
  const navigate = useNavigate()

  return (
    <Flex minH="calc(100dvh - 80px)" align="center" justify="center" px={{ base: 4, md: 8 }} py={{ base: 8, md: 12 }}>
      <Box
        w="full"
        maxW="900px"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="28px"
        bg="white"
        boxShadow="0 24px 60px rgba(15, 23, 42, 0.08)"
        overflow="hidden"
      >
        <Flex
          px={{ base: 5, md: 8 }}
          py={{ base: 5, md: 6 }}
          align={{ base: "flex-start", md: "center" }}
          justify="space-between"
          gap={4}
          borderBottom="1px solid"
          borderColor="gray.200"
          direction={{ base: "column", md: "row" }}
        >
          <Flex align="center" gap={3}>
            <Flex
              w="44px"
              h="44px"
              borderRadius="14px"
              align="center"
              justify="center"
              bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)"
              boxShadow="0 12px 30px rgba(66, 42, 251, 0.22)"
              flexShrink={0}
            >
              <Sparkles size={20} color="white" fill="white" />
            </Flex>
            <Box>
              <Heading fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
                Sessions
              </Heading>
              <Text fontSize="sm" color="gray.600">
                Session wizard entry point
              </Text>
            </Box>
          </Flex>

          <Button
            variant="ghost"
            leftIcon={<ArrowLeft size={16} />}
            onClick={() => navigate(APP_ROUTES.events)}
            alignSelf={{ base: "stretch", md: "auto" }}
          >
            Back to events
          </Button>
        </Flex>

        <Stack gap={4} px={{ base: 5, md: 8 }} py={{ base: 6, md: 8 }}>
          <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="800" color="gray.900">
            Session list is not wired yet.
          </Text>
          <Text fontSize="sm" color="gray.600" maxW="720px">
            The session wizard is route-driven and works against a session id. Until the list endpoint is exposed, this page serves as the
            landing area instead of rendering a blank screen.
          </Text>

          <Box
            borderRadius="24px"
            border="1px dashed"
            borderColor="gray.300"
            bg="gray.50"
            px={{ base: 5, md: 6 }}
            py={{ base: 6, md: 8 }}
          >
            <Flex
              direction={{ base: "column", md: "row" }}
              align={{ base: "stretch", md: "center" }}
              justify="space-between"
              gap={4}
            >
              <Box>
                <Text fontSize="sm" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                  Wizard
                </Text>
                <Text fontSize="md" fontWeight="700" color="gray.900" mt={1}>
                  Open a session from the event flow to continue editing here.
                </Text>
              </Box>

              <Button
                bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)"
                color="white"
                leftIcon={<CalendarPlus size={16} />}
                onClick={() => navigate(APP_ROUTES.events)}
              >
                Go to events
              </Button>
            </Flex>
          </Box>
        </Stack>
      </Box>
    </Flex>
  )
}
