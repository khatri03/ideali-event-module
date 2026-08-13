import { Box, Skeleton, SkeletonText } from "@chakra-ui/react"

export function ReportResultsTableSkeleton() {
  return (
    <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" p={5}>
      <Skeleton height="24px" width="200px" mb={4} />
      <Skeleton height="44px" mb={3} />
      <SkeletonText noOfLines={8} />
    </Box>
  )
}
