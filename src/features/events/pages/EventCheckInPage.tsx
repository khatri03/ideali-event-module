import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import { useParams } from "react-router-dom"
import { ScanLine } from "lucide-react"
import {
  AttendeeRosterPanel,
  CheckInCounts,
  CheckInScanPanel,
  CheckInWindowBanner,
} from "../components/checkin"
import { useCheckInDesk } from "../hooks/useCheckInDesk"

export function EventCheckInPage() {
  const { eventUniqueId = "", sessionUniqueId = "" } = useParams()
  const desk = useCheckInDesk(eventUniqueId, sessionUniqueId)

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
            bg="brand.gradient"
            flexShrink={0}
          >
            <ScanLine size={28} color="white" />
          </Box>

          <Box flex={1} minW={0}>
            <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="text.primary">
              Check-in
            </Heading>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="text.secondary">
              {desk.roster?.sessionName || "Scan a ticket, or find the guest by name if the code will not read."}
            </Text>
          </Box>
        </Stack>

        <Box mt={{ base: 4, md: 5 }}>
          <CheckInCounts counts={desk.roster?.counts ?? { issued: 0, arrived: 0, expected: 0 }} />
        </Box>
      </Box>

      <CheckInWindowBanner countdown={desk.countdown} />

      {/*
        The roster is what the operator works from between scans, so it takes the larger share. The
        columns are floored at zero because a grid track sized "1fr" still refuses to go below its
        content: the roster table is 880px wide by design, and without this the track grows to match
        it and carries the whole desk off the side of a phone instead of letting the table scroll.
      */}
      <Grid
        templateColumns={
          desk.isDoorOpen
            ? { base: "minmax(0, 1fr)", lg: "minmax(0, 35fr) minmax(0, 65fr)" }
            : "minmax(0, 1fr)"
        }
        gap={{ base: 6, lg: 8 }}
        alignItems="start"
      >
        {/*
          Nothing in the scan panel works before the window opens, so it is left off the screen rather
          than shown greyed out. The countdown above already says why, and a dead camera frame beside
          it only invites an operator to try the one thing that cannot succeed.
        */}
        {desk.isDoorOpen ? (
          <CheckInScanPanel
            attempt={desk.attempt}
            isOnline={desk.isOnline}
            isAdmitting={desk.isAdmitting}
            isReversing={desk.isReversing}
            onScan={desk.admit}
            onUndo={desk.reverse}
          />
        ) : null}

        <AttendeeRosterPanel
          roster={desk.roster}
          isLoading={desk.isLoading}
          isError={desk.isError}
          search={desk.search}
          scope={desk.scope}
          page={desk.page}
          pageSize={desk.pageSize}
          isDoorOpen={desk.isDoorOpen}
          busyTicketCode={desk.busyTicketCode}
          sendingTicketUniqueId={desk.sendingTicketUniqueId}
          onSearchChange={desk.setSearch}
          onScopeChange={desk.setScope}
          onPageChange={desk.setPage}
          onPageSizeChange={desk.setPageSize}
          onCheckIn={desk.admit}
          onUndo={desk.reverse}
          onSendTicket={desk.sendTicket}
        />
      </Grid>
    </Stack>
  )
}
