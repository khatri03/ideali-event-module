import { Box, Skeleton, SkeletonText, Stack } from "@chakra-ui/react"

/** Mirrors the per-session question blocks while the questionnaire definitions load. */
export function QuestionnaireStepSkeleton() {
  return (
    <Stack gap={5}>
      {[0, 1].map((sessionIndex) => (
        <Box key={sessionIndex} borderWidth="1px" borderColor="gray.200" borderRadius="20px" p={5} bg="gray.50">
          <Stack gap={4}>
            <Stack gap={2}>
              <Skeleton h="18px" w="55%" borderRadius="full" />
              <Skeleton h="12px" w="75%" borderRadius="full" />
            </Stack>

            <Stack gap={4}>
              {[0, 1].map((questionIndex) => (
                <Box
                  key={questionIndex}
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="16px"
                  bg="white"
                  p={4}
                >
                  <Stack gap={3}>
                    <SkeletonText noOfLines={1} />
                    <Skeleton h="44px" borderRadius="14px" />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Stack>
        </Box>
      ))}
    </Stack>
  )
}
