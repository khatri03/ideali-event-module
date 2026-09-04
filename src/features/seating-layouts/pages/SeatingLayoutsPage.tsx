import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Badge, Box, Button, Flex, Heading, HStack, Skeleton, SkeletonText, Table, Text } from "@chakra-ui/react"
import { ArrowLeft, ArrowRight, LayoutGrid, Plus } from "lucide-react"
import { APP_ROUTES } from "@/utils/routes"
import type { SeatsIoSeatingLayout } from "@/api/seatsio"
import { extractApiError } from "@/utils/errors"
import { useSeatingLayouts } from "../hooks/useSeatingLayouts"
import { SeatingLayoutsTableRow, SeatingLayoutPreviewModal } from "../components"

const PAGE_SIZE = 10

function buildPageNumbers(page: number, totalPages: number) {
  const pages: number[] = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)

  for (let current = start; current <= end; current += 1) {
    pages.push(current)
  }

  return pages
}

function SeatingLayoutsSkeleton() {
  return (
    <Box>
      <Skeleton height="32px" width="240px" mb={3} />
      <SkeletonText noOfLines={2} mb={8} />
      <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" p={5}>
        <Skeleton height="44px" mb={4} />
        <SkeletonText noOfLines={6} />
      </Box>
    </Box>
  )
}

export function SeatingLayoutsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1)
  const query = useSeatingLayouts(page, PAGE_SIZE)
  const [previewedLayout, setPreviewedLayout] = useState<SeatsIoSeatingLayout | null>(null)

  const pageNumbers = useMemo(
    () => buildPageNumbers(query.data?.page ?? page, query.data?.totalPages ?? 0),
    [page, query.data?.page, query.data?.totalPages]
  )

  function updatePage(nextPage: number) {
    const params = new URLSearchParams(searchParams)
    params.set("page", String(nextPage))
    setSearchParams(params, { replace: true })
  }

  function handleEditLayout(layout: SeatsIoSeatingLayout) {
    navigate(APP_ROUTES.seatingLayouts.edit(layout.uniqueId))
  }

  function handlePreviewLayout(layout: SeatsIoSeatingLayout) {
    setPreviewedLayout(layout)
  }

  if (query.isLoading && !query.data) {
    return <SeatingLayoutsSkeleton />
  }

  const layouts = query.data?.items ?? []
  const totalPages = query.data?.totalPages ?? 0
  const currentPage = query.data?.page ?? page

  return (
    <Box w="full">
      <Flex
        direction={{ base: "column", lg: "row" }}
        align={{ base: "stretch", lg: "center" }}
        justify="space-between"
        gap={4}
        mb={6}
      >
        <Box>
          <HStack gap={2} mb={2}>
            <Box color="brand.500">
              <LayoutGrid size={18} />
            </Box>
            <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.12em" color="gray.500">
              Seats.io
            </Text>
          </HStack>
          <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
            Seating Layouts
          </Heading>
          <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="2xl">
            Review seating layouts created inside the Seats.io designer and open the layout builder when you need a new one.
          </Text>
        </Box>

        <Button
          w={{ base: "full", md: "auto" }}
          minH="11"
          px={5}
          borderRadius="14px"
          fontWeight="700"
          bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)"
          color="white"
          onClick={() => navigate(APP_ROUTES.seatingLayouts.create)}
        >
          <Plus size={16} />
          Add Layout
        </Button>
      </Flex>

      <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" boxShadow="card">
        {query.isError ? (
          <Box px={{ base: 4, md: 6 }} py={4} borderBottom="1px solid" borderColor="border.subtle">
            <Text fontSize="sm" fontWeight="600" color="red.500">
              {extractApiError(query.error)}
            </Text>
          </Box>
        ) : null}
        <Box px={{ base: 4, md: 6 }} py={4} borderBottom="1px solid" borderColor="border.subtle">
          <Flex direction={{ base: "column", md: "row" }} justify="space-between" gap={3}>
            <Box>
              <Text fontSize="lg" fontWeight="700" color="text.primary">
                Saved layouts
              </Text>
              <Text fontSize="sm" color="text.secondary">
                {query.data ? `${query.data.total} layout${query.data.total === 1 ? "" : "s"} total` : "Loading layout inventory"}
              </Text>
            </Box>
            <Badge variant="subtle" colorPalette="purple" borderRadius="999px" px={3} py={1} alignSelf="start">
              Page {currentPage}
            </Badge>
          </Flex>
        </Box>

        <Box overflowX="auto" borderTop="1px solid" borderColor="border.subtle">
          <Table.Root variant="line" size="sm" borderColor="border.subtle" minW={{ base: "900px", md: "auto" }}>
            <Table.Header>
              <Table.Row bg="app.bg">
                <Table.ColumnHeader px={4} py={3} textAlign="center">
                  Actions
                </Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3}>Preview</Table.ColumnHeader>
                <Table.ColumnHeader px={6} py={3}>Layout</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3}>Venue</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3}>Chart key</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3}>Validation</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {layouts.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={6} py={12}>
                    <Box textAlign="center">
                      <Text fontSize="lg" fontWeight="700" color="gray.900">
                        No seating layouts yet
                      </Text>
                      <Text mt={2} fontSize="sm" color="gray.600">
                        Add the first layout to start designing a Seats.io chart.
                      </Text>
                      <Button mt={5} px={5} onClick={() => navigate(APP_ROUTES.seatingLayouts.create)}>
                        <Plus size={16} />
                        Add Layout
                      </Button>
                    </Box>
                  </Table.Cell>
                </Table.Row>
              ) : (
                layouts.map((layout) => (
                  <SeatingLayoutsTableRow
                    key={layout.uniqueId}
                    layout={layout}
                    onEdit={handleEditLayout}
                    onPreview={handlePreviewLayout}
                  />
                ))
              )}
            </Table.Body>
          </Table.Root>
        </Box>

        <Flex
          px={{ base: 4, md: 6 }}
          py={4}
          align={{ base: "stretch", md: "center" }}
          justify="space-between"
          direction={{ base: "column", md: "row" }}
          gap={3}
          borderTop="1px solid"
          borderColor="border.subtle"
        >
          <Text fontSize="sm" color="gray.600">
            Page {currentPage} of {Math.max(totalPages, 1)}
          </Text>

          <HStack gap={2} wrap="wrap">
            <Button
              minH="11"
              px={4}
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => updatePage(currentPage - 1)}
            >
              <ArrowLeft size={16} />
              Previous
            </Button>
            {pageNumbers.map((item) => (
              <Button
                key={item}
                minH="11"
                px={4}
                variant={item === currentPage ? "solid" : "outline"}
                bg={item === currentPage ? "brand.500" : undefined}
                color={item === currentPage ? "white" : undefined}
                onClick={() => updatePage(item)}
              >
                {item}
              </Button>
            ))}
            <Button
              minH="11"
              px={4}
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => updatePage(currentPage + 1)}
            >
              Next
              <ArrowRight size={16} />
            </Button>
          </HStack>
        </Flex>
      </Box>

      <SeatingLayoutPreviewModal layout={previewedLayout} onClose={() => setPreviewedLayout(null)} />
    </Box>
  )
}
