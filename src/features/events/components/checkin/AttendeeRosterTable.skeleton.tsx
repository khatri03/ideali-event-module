import { Box, Skeleton, Stack } from "@chakra-ui/react"

interface AttendeeRosterTableSkeletonProps {
  rowCount?: number
}

export function AttendeeRosterTableSkeleton({ rowCount = 6 }: AttendeeRosterTableSkeletonProps) {
  return (
    <Box borderWidth="1px" borderColor="border.subtle" borderRadius="16px" p={4}>
      <Stack gap={3}>
        {Array.from({ length: rowCount }, (_, index) => (
          <Skeleton key={index} height="52px" borderRadius="12px" />
        ))}
      </Stack>
    </Box>
  )
}
