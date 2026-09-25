import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"
import { Box, Flex, Grid, Input, Stack, Text, Textarea, chakra } from "@chakra-ui/react"
import { Field } from "@chakra-ui/react"
import { FileText } from "lucide-react"
import { StyledSelect } from "@/components/common"
import { RequiredFieldLabel } from "@/features/custom-lists"
import { extractApiError } from "@/utils/errors"
import { formatCurrency } from "@/utils/format"
import { APP_ROUTES } from "@/utils/routes"
import { useEventInvoiceFilterOptions } from "../hooks/useEventInvoices"
import {
  useActiveEventInvoiceCategoryOptions,
  useCreateEventCustomInvoice,
} from "../hooks/useEventCustomInvoiceMutations"
import { customInvoiceSchema, type CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"
import { BackToInvoicesButton } from "../components/BackToInvoicesButton"

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

const DEFAULT_VALUES: CustomInvoiceFormValues = {
  eventUniqueId: "",
  categoryUniqueId: "",
  dueDate: "",
  companyName: "",
  firstName: "",
  middleName: "",
  lastName: "",
  cellPhone: "",
  email: "",
  specialNotes: "",
  lineItems: [{ description: "", amount: "" }],
}

const FIELD_LABEL_PROPS = { fontSize: "sm", fontWeight: "700", color: "text.primary" } as const

/**
 * The routed page for authoring a custom event invoice. This tracer slice bills a single line against one
 * event and active sponsorship type, with the required buyer fields and a due date, and saves through the
 * real endpoint. The member picker, multi-line editor, notes and edit mode are added by later plans.
 */
export function EventCustomInvoiceFormPage() {
  const navigate = useNavigate()
  const eventsQuery = useEventInvoiceFilterOptions()
  const categoriesQuery = useActiveEventInvoiceCategoryOptions()
  const createMutation = useCreateEventCustomInvoice()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CustomInvoiceFormValues>({
    resolver: zodResolver(customInvoiceSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const eventOptions = (eventsQuery.data?.events ?? []).map((event) => ({
    label: event.name,
    value: event.uniqueId,
  }))
  const categoryOptions = (categoriesQuery.data ?? []).map((category) => ({
    label: category.name,
    value: category.uniqueId,
  }))
  const hasNoActiveCategories = categoriesQuery.isSuccess && categoryOptions.length === 0

  const amount = useWatch({ control, name: "lineItems.0.amount" })
  const grandTotal = formatCurrency(AMOUNT_PATTERN.test((amount ?? "").trim()) ? amount : "0", "$")

  const goBack = () => navigate(APP_ROUTES.eventInvoices.list)

  async function onSubmit(values: CustomInvoiceFormValues) {
    try {
      await createMutation.mutateAsync({
        eventUniqueId: values.eventUniqueId,
        categoryUniqueId: values.categoryUniqueId,
        dueDateUtc: new Date(`${values.dueDate}T00:00:00`).toISOString(),
        companyName: values.companyName,
        firstName: values.firstName,
        middleName: values.middleName,
        lastName: values.lastName,
        cellPhone: values.cellPhone,
        email: values.email,
        specialNotes: values.specialNotes,
        lineItems: values.lineItems.map((line) => ({
          description: line.description,
          amount: line.amount,
        })),
      })
      navigate(APP_ROUTES.eventInvoices.list)
    } catch {
      // Kept on the page so the banner below stays visible with the entered values still in view.
    }
  }

  return (
    <Stack gap={5} maxW="4xl" mx="auto" as="form" onSubmit={handleSubmit(onSubmit)}>
      <Box borderRadius="20px" bg="brand.700" color="white" boxShadow="card" overflow="hidden">
        <Stack gap={{ base: 4, md: 5 }} px={{ base: 4, md: 7 }} py={{ base: 5, md: 6 }}>
          <BackToInvoicesButton onBack={goBack} tone="onBrand" />
          <Flex gap={4} align="center">
            <Flex
              w="12"
              h="12"
              flexShrink={0}
              align="center"
              justify="center"
              borderRadius="16px"
              bg="whiteAlpha.200"
              aria-hidden="true"
            >
              <FileText size={22} />
            </Flex>
            <Stack gap={1} minW={0}>
              <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="900" lineHeight="1.1">
                New custom invoice
              </Text>
              <Text fontSize={{ base: "sm", md: "md" }} color="whiteAlpha.800">
                Bill a sponsor or partner against one of your events.
              </Text>
            </Stack>
          </Flex>
        </Stack>
      </Box>

      {createMutation.isError ? (
        <Box role="alert" p={4} borderRadius="16px" bg="status.error.bg">
          <Text fontSize="sm" fontWeight="700" color="status.error.fg">
            {extractApiError(createMutation.error)}
          </Text>
        </Box>
      ) : null}

      <Box borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
        <Stack gap={5}>
          <Text fontSize="md" fontWeight="800" color="text.primary">
            Invoice basics
          </Text>

          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
            <Field.Root invalid={Boolean(errors.eventUniqueId)}>
              <RequiredFieldLabel>Event</RequiredFieldLabel>
              <Controller
                control={control}
                name="eventUniqueId"
                render={({ field }) => (
                  <StyledSelect
                    options={eventOptions}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={eventsQuery.isLoading}
                    placeholder={eventsQuery.isLoading ? "Loading events..." : "Select an event"}
                    ariaLabel="Event"
                  />
                )}
              />
              <Field.ErrorText>{errors.eventUniqueId?.message}</Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={Boolean(errors.categoryUniqueId)}>
              <RequiredFieldLabel>Sponsorship type</RequiredFieldLabel>
              <Controller
                control={control}
                name="categoryUniqueId"
                render={({ field }) => (
                  <StyledSelect
                    options={categoryOptions}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={categoriesQuery.isLoading || hasNoActiveCategories}
                    placeholder={categoriesQuery.isLoading ? "Loading types..." : "Select a sponsorship type"}
                    ariaLabel="Sponsorship type"
                  />
                )}
              />
              {hasNoActiveCategories ? (
                <Field.HelperText>
                  No active sponsorship types yet. Add one under Invoice Categories first.
                </Field.HelperText>
              ) : null}
              <Field.ErrorText>{errors.categoryUniqueId?.message}</Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={Boolean(errors.dueDate)}>
              <RequiredFieldLabel>Payment due date</RequiredFieldLabel>
              <Input type="date" minH="11" borderRadius="12px" {...register("dueDate")} />
              <Field.ErrorText>{errors.dueDate?.message}</Field.ErrorText>
            </Field.Root>
          </Grid>
        </Stack>
      </Box>

      <Box borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
        <Stack gap={5}>
          <Text fontSize="md" fontWeight="800" color="text.primary">
            Buyer
          </Text>

          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
            <Field.Root invalid={Boolean(errors.companyName)}>
              <RequiredFieldLabel>Company name</RequiredFieldLabel>
              <Input minH="11" borderRadius="12px" autoComplete="off" {...register("companyName")} />
              <Field.ErrorText>{errors.companyName?.message}</Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={Boolean(errors.email)}>
              <RequiredFieldLabel>Email address</RequiredFieldLabel>
              <Input minH="11" borderRadius="12px" inputMode="email" autoComplete="off" {...register("email")} />
              <Field.ErrorText>{errors.email?.message}</Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={Boolean(errors.firstName)}>
              <Field.Label {...FIELD_LABEL_PROPS}>First name</Field.Label>
              <Input minH="11" borderRadius="12px" autoComplete="off" {...register("firstName")} />
              <Field.ErrorText>{errors.firstName?.message}</Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={Boolean(errors.middleName)}>
              <Field.Label {...FIELD_LABEL_PROPS}>Middle name</Field.Label>
              <Input minH="11" borderRadius="12px" autoComplete="off" {...register("middleName")} />
              <Field.ErrorText>{errors.middleName?.message}</Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={Boolean(errors.lastName)}>
              <RequiredFieldLabel>Last name</RequiredFieldLabel>
              <Input minH="11" borderRadius="12px" autoComplete="off" {...register("lastName")} />
              <Field.ErrorText>{errors.lastName?.message}</Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={Boolean(errors.cellPhone)}>
              <Field.Label {...FIELD_LABEL_PROPS}>Cell phone</Field.Label>
              <Input minH="11" borderRadius="12px" autoComplete="off" {...register("cellPhone")} />
              <Field.ErrorText>{errors.cellPhone?.message}</Field.ErrorText>
            </Field.Root>
          </Grid>
        </Stack>
      </Box>

      <Box borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
        <Stack gap={5}>
          <Text fontSize="md" fontWeight="800" color="text.primary">
            Line item
          </Text>

          <Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap={4}>
            <Field.Root invalid={Boolean(errors.lineItems?.[0]?.description)}>
              <RequiredFieldLabel>Description</RequiredFieldLabel>
              <Input
                minH="11"
                borderRadius="12px"
                autoComplete="off"
                placeholder="e.g. Gold sponsorship"
                {...register("lineItems.0.description")}
              />
              <Field.ErrorText>{errors.lineItems?.[0]?.description?.message}</Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={Boolean(errors.lineItems?.[0]?.amount)}>
              <RequiredFieldLabel>Amount</RequiredFieldLabel>
              <Input
                minH="11"
                borderRadius="12px"
                inputMode="decimal"
                placeholder="0.00"
                {...register("lineItems.0.amount")}
              />
              <Field.ErrorText>{errors.lineItems?.[0]?.amount?.message}</Field.ErrorText>
            </Field.Root>
          </Grid>

          <Flex justify="space-between" align="center" pt={1}>
            <Text fontSize="sm" fontWeight="700" color="text.secondary">
              Grand total
            </Text>
            <Text fontSize="lg" fontWeight="900" color="text.primary">
              {grandTotal}
            </Text>
          </Flex>

          <Field.Root invalid={Boolean(errors.specialNotes)}>
            <Field.Label {...FIELD_LABEL_PROPS}>Special notes</Field.Label>
            <Textarea borderRadius="12px" rows={3} autoComplete="off" {...register("specialNotes")} />
            <Field.HelperText>Optional. Shown on the invoice, up to 2000 characters.</Field.HelperText>
            <Field.ErrorText>{errors.specialNotes?.message}</Field.ErrorText>
          </Field.Root>
        </Stack>
      </Box>

      <Flex gap={3} justify="flex-end" direction={{ base: "column-reverse", md: "row" }}>
        <chakra.button
          type="button"
          onClick={goBack}
          minH="11"
          px={6}
          borderRadius="14px"
          border="1px solid"
          borderColor="border.subtle"
          bg="transparent"
          fontWeight="700"
          color="text.primary"
          cursor="pointer"
          w={{ base: "full", md: "auto" }}
          _hover={{ bg: "app.bg" }}
        >
          Cancel
        </chakra.button>
        <chakra.button
          type="submit"
          minH="11"
          px={8}
          borderRadius="14px"
          bg="brand.gradient"
          color="white"
          fontWeight="800"
          w={{ base: "full", md: "auto" }}
          cursor={createMutation.isPending ? "not-allowed" : "pointer"}
          opacity={createMutation.isPending ? 0.7 : 1}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "Saving..." : "Save invoice"}
        </chakra.button>
      </Flex>
    </Stack>
  )
}
