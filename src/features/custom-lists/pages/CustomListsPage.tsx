import { Box, Heading, Stack, Text } from "@chakra-ui/react"
import { ListChecks } from "lucide-react"
import { CustomListsManager } from "../components/CustomListsManager"

export function CustomListsPage() {
  return (
    <Stack gap={6}>
      <Box
        border="1px solid"
        borderColor="border.subtle"
        borderRadius="20px"
        bg="card.bg"
        boxShadow="card"
        p={{ base: 4, md: 6 }}
      >
        <Stack direction={{ base: "column", md: "row" }} align={{ base: "flex-start", md: "center" }} gap={4}>
          <Box
            w="64px"
            h="64px"
            borderRadius="18px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
            flexShrink={0}
          >
            <ListChecks size={28} color="white" />
          </Box>

          <Box flex={1}>
            <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
              Custom Lists
            </Heading>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="3xl">
              Group members into named lists you can reuse. List names must be unique within your organization.
            </Text>
          </Box>
        </Stack>
      </Box>

      <CustomListsManager />
    </Stack>
  )
}
