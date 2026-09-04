import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Field,
  Flex,
  Input,
  Skeleton,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@chakra-ui/react"
import { Edit3, Plus, Trash2 } from "lucide-react"
import { extractApiError, isCategoryInUseError } from "@/utils/errors"
import { type SeatsIoChartCategory } from "@/api/seatsio"
import {
  useCreateSeatsIoChartCategory,
  useDeleteSeatsIoChartCategory,
  useSeatsIoChartCategories,
  useUpdateSeatsIoChartCategory,
} from "../hooks/useSeatsIoChartCategories"
import {
  seatingLayoutCategorySchema,
  type SeatingLayoutCategoryValues,
} from "../schemas/seatingLayoutCategory.schemas"

interface SeatsIoChartCategoriesCardProps {
  chartUniqueId?: string | null
  chartName?: string | null
  isEnabled?: boolean
  onCategoriesChanged?: () => void
}

const DEFAULT_COLOR = "#7551FF"

function CategorySwatch({ color }: { color: string }) {
  return (
    <Box
      w="28px"
      h="28px"
      borderRadius="full"
      border="1px solid"
      borderColor="border.subtle"
      bg={color}
      boxShadow="sm"
      aria-hidden="true"
    />
  )
}

function CategoriesSkeleton() {
  return (
    <Stack gap={3} mt={4}>
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} height="52px" borderRadius="16px" />
      ))}
    </Stack>
  )
}

export function SeatsIoChartCategoriesCard({
  chartUniqueId,
  chartName,
  isEnabled = true,
  onCategoriesChanged,
}: SeatsIoChartCategoriesCardProps) {
  const normalizedChartUniqueId = chartUniqueId?.trim() ?? ""
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<SeatsIoChartCategory | null>(null)
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<SeatsIoChartCategory | null>(null)
  const [formError, setFormError] = useState("")
  const [deleteError, setDeleteError] = useState("")
  // A category Seats.io reported as still holding objects. The refusal will repeat until the objects are moved in
  // the designer, so the delete stops being offered for it rather than being offered and refused again.
  const [categoriesAssignedToObjects, setCategoriesAssignedToObjects] = useState<ReadonlySet<string>>(new Set())

  const categoriesQuery = useSeatsIoChartCategories(normalizedChartUniqueId, isEnabled)
  const createCategoryMutation = useCreateSeatsIoChartCategory()
  const updateCategoryMutation = useUpdateSeatsIoChartCategory()
  const deleteCategoryMutation = useDeleteSeatsIoChartCategory()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SeatingLayoutCategoryValues>({
    resolver: zodResolver(seatingLayoutCategorySchema),
    defaultValues: {
      name: "",
      color: DEFAULT_COLOR,
    },
  })

  const colorValue = watch("color") || DEFAULT_COLOR

  const categories = useMemo(
    () =>
      [...(categoriesQuery.data ?? [])].sort((left, right) => {
        if (left.displayOrder !== right.displayOrder) {
          return left.displayOrder - right.displayOrder
        }

        return left.name.localeCompare(right.name)
      }),
    [categoriesQuery.data]
  )

  useEffect(() => {
    if (!isCategoryDialogOpen) {
      return
    }

    reset({
      name: editingCategory?.name ?? "",
      color: editingCategory?.color ?? DEFAULT_COLOR,
    })
    setFormError("")
  }, [editingCategory, isCategoryDialogOpen, reset])

  function openCreateCategoryDialog() {
    setEditingCategory(null)
    setPendingDeleteCategory(null)
    setDeleteError("")
    setFormError("")
    setIsCategoryDialogOpen(true)
  }

  function openEditCategoryDialog(category: SeatsIoChartCategory) {
    setPendingDeleteCategory(null)
    setDeleteError("")
    setEditingCategory(category)
    setFormError("")
    setIsCategoryDialogOpen(true)
  }

  function closeCategoryDialog() {
    setIsCategoryDialogOpen(false)
    setEditingCategory(null)
    setFormError("")
  }

  function requestDeleteCategory(category: SeatsIoChartCategory) {
    setEditingCategory(null)
    setFormError("")
    setDeleteError("")
    setPendingDeleteCategory(category)
  }

  function closeDeleteDialog() {
    setPendingDeleteCategory(null)
    setDeleteError("")
  }

  async function handleSubmitCategory(values: SeatingLayoutCategoryValues) {
    if (!normalizedChartUniqueId) {
      return
    }

    const payload = {
      name: values.name.trim(),
      color: values.color.trim(),
    }

    try {
      setFormError("")

      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          chartUniqueId: normalizedChartUniqueId,
          categoryUniqueId: editingCategory.uniqueId,
          payload,
        })
      } else {
        await createCategoryMutation.mutateAsync({
          chartUniqueId: normalizedChartUniqueId,
          payload,
        })
      }

      closeCategoryDialog()
      onCategoriesChanged?.()
    } catch (error) {
      setFormError(extractApiError(error))
    }
  }

  async function handleDeleteCategory() {
    if (!normalizedChartUniqueId || !pendingDeleteCategory) {
      return
    }

    try {
      setDeleteError("")
      await deleteCategoryMutation.mutateAsync({
        chartUniqueId: normalizedChartUniqueId,
        categoryUniqueId: pendingDeleteCategory.uniqueId,
      })
      closeDeleteDialog()
      onCategoriesChanged?.()
    } catch (error) {
      if (isCategoryInUseError(error)) {
        setCategoriesAssignedToObjects((current) => new Set(current).add(pendingDeleteCategory.uniqueId))
      }

      setDeleteError(extractApiError(error))
    }
  }

  if (!normalizedChartUniqueId || !isEnabled) {
    return null
  }

  const isPendingCategoryAssignedToObjects = Boolean(
    pendingDeleteCategory && categoriesAssignedToObjects.has(pendingDeleteCategory.uniqueId)
  )

  return (
    <>
      <Box
        borderRadius="24px"
        border="1px solid"
        borderColor="border.subtle"
        bg="card.bg"
        p={5}
        boxShadow="card"
      >
        <Flex align={{ base: "flex-start", md: "center" }} justify="space-between" gap={4} wrap="wrap">
          <Box>
            <Text fontSize="lg" fontWeight="700" color="text.primary">
              Chart categories
            </Text>
            <Text mt={1} fontSize="sm" color="text.secondary">
              {chartName?.trim()
                ? `Categories mapped with ${chartName.trim()}.`
                : "Categories mapped with the selected chart."}
            </Text>
          </Box>

          <Tooltip.Root openDelay={250} closeDelay={100}>
            <Tooltip.Trigger asChild>
              <Button
                type="button"
                aria-label="Add chart category"
                borderRadius="full"
                minH="11"
                w="44px"
                minW="44px"
                p={0}
                bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)"
                color="white"
                onClick={openCreateCategoryDialog}
              >
                <Plus size={16} />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>Add category</Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        </Flex>

        {categoriesQuery.isLoading && !categoriesQuery.data ? (
          <CategoriesSkeleton />
        ) : categoriesQuery.isError ? (
          <Box mt={4} p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
            <Text fontSize="sm" fontWeight="700" color="red.700">
              Failed to load categories
            </Text>
            <Text mt={1} fontSize="sm" color="red.600">
              {extractApiError(categoriesQuery.error)}
            </Text>
          </Box>
        ) : (
          <Box mt={4} overflowX="auto">
            <Table.Root variant="line" size="sm">
              <Table.Header>
                <Table.Row bg="app.bg">
                  <Table.ColumnHeader px={5} py={3}>
                    Category name
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={5} py={3} textAlign="center">
                    Color
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={5} py={3} textAlign="right">
                    Actions
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {categories.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={3} py={12}>
                      <Box textAlign="center">
                        <Text fontSize="lg" fontWeight="700" color="text.primary">
                          No categories yet
                        </Text>
                        <Text mt={2} fontSize="sm" color="text.secondary">
                          Create the first category to organize this Seats.io chart.
                        </Text>
                        <Button mt={5} minH="11" px={5} onClick={openCreateCategoryDialog}>
                          <Plus size={16} />
                          Add category
                        </Button>
                      </Box>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  categories.map((category) => {
                    const isAssignedToObjects = categoriesAssignedToObjects.has(category.uniqueId)

                    return (
                      <Table.Row key={category.uniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s">
                        <Table.Cell px={5} py={4}>
                          <Text fontSize="sm" fontWeight="700" color="text.primary">
                            {category.name}
                          </Text>
                        </Table.Cell>
                        <Table.Cell px={5} py={4} textAlign="center">
                          <Flex justify="center">
                            <CategorySwatch color={category.color} />
                          </Flex>
                        </Table.Cell>
                        <Table.Cell px={5} py={4} textAlign="right">
                          <Flex justify="flex-end" gap={2} wrap="wrap">
                            <Tooltip.Root openDelay={250} closeDelay={100}>
                              <Tooltip.Trigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  aria-label={`Edit category ${category.name}`}
                                  borderRadius="full"
                                  minH="11"
                                  w="44px"
                                  minW="44px"
                                  p={0}
                                  onClick={() => openEditCategoryDialog(category)}
                                >
                                  <Edit3 size={15} />
                                </Button>
                              </Tooltip.Trigger>
                              <Tooltip.Positioner>
                                <Tooltip.Content>Edit category</Tooltip.Content>
                              </Tooltip.Positioner>
                            </Tooltip.Root>

                            <Tooltip.Root openDelay={250} closeDelay={100}>
                              <Tooltip.Trigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  colorPalette="red"
                                  aria-label={`Delete category ${category.name}`}
                                  borderRadius="full"
                                  minH="11"
                                  w="44px"
                                  minW="44px"
                                  p={0}
                                  // Left focusable and hoverable rather than disabled, so the tooltip can say why
                                  // the delete is not on offer instead of leaving a dead grey button.
                                  aria-disabled={isAssignedToObjects}
                                  opacity={isAssignedToObjects ? 0.5 : 1}
                                  cursor={isAssignedToObjects ? "not-allowed" : "pointer"}
                                  onClick={() => {
                                    if (isAssignedToObjects) {
                                      return
                                    }

                                    requestDeleteCategory(category)
                                  }}
                                >
                                  <Trash2 size={15} />
                                </Button>
                              </Tooltip.Trigger>
                              <Tooltip.Positioner>
                                <Tooltip.Content>
                                  {isAssignedToObjects
                                    ? "Seats are assigned to this category. Move them to another category in the designer first."
                                    : "Delete category"}
                                </Tooltip.Content>
                              </Tooltip.Positioner>
                            </Tooltip.Root>
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </Box>

      <Dialog.Root
        open={isCategoryDialogOpen}
        onOpenChange={(details) => {
          if (!details.open) {
            closeCategoryDialog()
          }
        }}
        size="md"
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "520px" }}
            maxH={{ base: "100dvh", md: "90vh" }}
            m={{ base: 0, md: "auto" }}
            overflow="hidden"
            display="flex"
            flexDirection="column"
          >
            <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="gray.200">
              <Flex align="flex-start" justify="space-between" gap={4}>
                <Box>
                  <Text fontSize="lg" fontWeight="800" color="gray.900">
                    {editingCategory ? "Edit category" : "Add category"}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Name and color are saved to Seats.io for this chart.
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close category modal" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              <Stack gap={4}>
                <Field.Root invalid={!!errors.name}>
                  <Field.Label>Name</Field.Label>
                  <Input
                    {...register("name")}
                    placeholder="VIP seats"
                    minH="11"
                    borderRadius="14px"
                    px={4}
                  />
                  {errors.name ? <Field.ErrorText>{errors.name.message}</Field.ErrorText> : null}
                </Field.Root>

                <Field.Root invalid={!!errors.color}>
                  <Field.Label>Color</Field.Label>
                  <Flex align="center" gap={4} wrap="wrap">
                    <Box
                      w="52px"
                      h="52px"
                      borderRadius="16px"
                      border="1px solid"
                      borderColor="border.subtle"
                      bg={colorValue}
                      boxShadow="sm"
                    />
                    <Input type="color" maxW="180px" h="52px" p={1} {...register("color")} />
                  </Flex>
                  {errors.color ? <Field.ErrorText>{errors.color.message}</Field.ErrorText> : null}
                </Field.Root>

                {formError ? (
                  <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
                    <Text fontSize="sm" fontWeight="700" color="red.700">
                      {formError}
                    </Text>
                  </Box>
                ) : null}
              </Stack>
            </Dialog.Body>

            <Flex
              px={6}
              py={5}
              borderTop="1px solid"
              borderColor="gray.200"
              align="center"
              justify="space-between"
              gap={3}
              flexWrap="wrap"
            >
              <Button
                type="button"
                variant="outline"
                colorPalette="gray"
                borderRadius="14px"
                h="44px"
                px={6}
                minW={{ base: "full", md: "140px" }}
                onClick={closeCategoryDialog}
              >
                Cancel
              </Button>

              <Button
                type="button"
                borderRadius="14px"
                h="44px"
                px={6}
                minW={{ base: "full", md: "140px" }}
                color="white"
                style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                loading={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                onClick={handleSubmit(handleSubmitCategory)}
              >
                {editingCategory ? "Save changes" : "Create category"}
              </Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(pendingDeleteCategory)}
        onOpenChange={(details) => {
          if (!details.open) {
            closeDeleteDialog()
          }
        }}
        size="sm"
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "460px" }}
            maxH={{ base: "100dvh", md: "90vh" }}
            m={{ base: 0, md: "auto" }}
            overflow="hidden"
            display="flex"
            flexDirection="column"
          >
            <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="gray.200">
              <Flex align="flex-start" justify="space-between" gap={4}>
                <Box>
                  <Text fontSize="lg" fontWeight="800" color="gray.900">
                    Delete category
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {pendingDeleteCategory ? `Delete "${pendingDeleteCategory.name}" from Seats.io and our database.` : "This action will remove the category from Seats.io and our database."}
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close delete confirmation" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              <Stack gap={4}>
                <Box p={4} borderRadius="18px" border="1px solid" borderColor="red.200" bg="red.50">
                  <Text fontSize="sm" fontWeight="700" color="red.700">
                    {pendingDeleteCategory?.name}
                  </Text>
                  <Text mt={1} fontSize="sm" color="red.600">
                    {isPendingCategoryAssignedToObjects
                      ? "Move its seats to another category in the designer, then delete it."
                      : "Are you sure you want to delete this category?"}
                  </Text>
                </Box>

                {deleteError ? (
                  <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
                    <Text fontSize="sm" fontWeight="700" color="red.700">
                      {deleteError}
                    </Text>
                  </Box>
                ) : null}
              </Stack>
            </Dialog.Body>

            <Flex
              px={6}
              py={5}
              borderTop="1px solid"
              borderColor="gray.200"
              align="center"
              justify="space-between"
              gap={3}
              flexWrap="wrap"
            >
              <Button
                type="button"
                variant="outline"
                colorPalette="gray"
                borderRadius="14px"
                h="44px"
                px={6}
                minW={{ base: "full", md: "140px" }}
                onClick={closeDeleteDialog}
              >
                {isPendingCategoryAssignedToObjects ? "Close" : "Cancel"}
              </Button>

              {/* The refusal is final until the seats are moved in the designer, so the delete is withdrawn rather
                  than left there to be pressed into the same refusal again. */}
              {isPendingCategoryAssignedToObjects ? null : (
                <Button
                  type="button"
                  borderRadius="14px"
                  h="44px"
                  px={6}
                  minW={{ base: "full", md: "140px" }}
                  color="white"
                  colorPalette="red"
                  loading={deleteCategoryMutation.isPending}
                  onClick={() => void handleDeleteCategory()}
                >
                  Delete
                </Button>
              )}
            </Flex>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  )
}
