import { Box, Skeleton, SkeletonText } from "@chakra-ui/react"

export function ReportTemplatesTableSkeleton() {
  return (
    <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" p={5}>
      <Skeleton height="44px" mb={3} />
      <SkeletonText noOfLines={6} />
    </Box>
  )
}
