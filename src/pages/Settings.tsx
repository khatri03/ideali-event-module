import { Text, Flex } from "@chakra-ui/react"
import { Settings as SettingsIcon } from "lucide-react"

export function Settings() {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      minH="60vh"
      gap={4}
    >
      <Flex
        w="72px"
        h="72px"
        borderRadius="20px"
        align="center"
        justify="center"
        style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
      >
        <SettingsIcon size={32} color="white" />
      </Flex>
      <Text fontSize="2xl" fontWeight="800" color="text.primary">
        Settings
      </Text>
      <Text fontSize="sm" color="text.secondary" textAlign="center" maxW="320px">
        Workspace settings, integrations, and preferences will be available here.
      </Text>
    </Flex>
  )
}
