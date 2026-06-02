import { Badge, Box, Button, Field, Flex, SimpleGrid, Skeleton, SkeletonText, Stack, Text } from "@chakra-ui/react"
import { Check } from "lucide-react"
import { useFormContext } from "react-hook-form"
import { StyledSelect } from "@/components/common"
import { StepFieldLabel } from "../components/StepFieldLabel"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"
import { useEventPaymentAccountStep } from "../hooks/useEventPaymentAccountStep"

export function EventPaymentAccountStepPage() {
  const {
    formState: { errors },
  } = useFormContext<EventWizardValues>()
  const {
    error,
    isLoading,
    isMethodsLoading,
    paymentAccounts,
    paymentMethods,
    selectedAccount,
    selectedPaymentAccountUniqueId,
    selectedPaymentMethods,
    reload,
    selectPaymentAccount,
    togglePaymentMethod,
  } = useEventPaymentAccountStep()

  if (error) {
    return (
      <Box
        borderRadius="20px"
        border="1px solid"
        borderColor="red.200"
        bg="red.50"
        p={5}
        color="red.700"
      >
        <Stack gap={3}>
          <Text fontSize="sm" fontWeight="700">
            Unable to load payment account details
          </Text>
          <Text fontSize="sm">{error}</Text>
          <Box>
            <Button size="sm" variant="outline" colorPalette="red" onClick={reload}>
              Retry
            </Button>
          </Box>
        </Stack>
      </Box>
    )
  }

  if (isLoading) {
    return <PaymentAccountStepSkeleton />
  }

  const hasPaymentAccounts = paymentAccounts.length > 0
  const paymentAccountError = errors.paymentAccountId?.message
  const paymentMethodsError = errors.paymentMethods?.message

  return (
    <Stack h="full" gap={5}>
      <Stack flex="1" gap={5}>
        <Field.Root invalid={Boolean(paymentAccountError) || !hasPaymentAccounts}>
          <StepFieldLabel label="Payment account" isRequired />
          <StyledSelect
            options={paymentAccounts.map((account) => ({
              label: `${account.name}${account.tapToPayEnabled ? " · Tap to Pay" : ""}`,
              value: account.uniqueId,
            }))}
            value={selectedPaymentAccountUniqueId}
            onChange={selectPaymentAccount}
            placeholder="Select a payment account"
            disabled={!hasPaymentAccounts}
          />
          {hasPaymentAccounts ? (
            <Field.HelperText>
              Select the organizer payment account that will receive funds for this event.
            </Field.HelperText>
          ) : (
            <Field.ErrorText>
              No payment accounts are connected yet. Add one in your organizer settings before continuing.
            </Field.ErrorText>
          )}
          {paymentAccountError ? <Field.ErrorText>{paymentAccountError}</Field.ErrorText> : null}
        </Field.Root>

        {selectedAccount ? (
          <Stack gap={3}>
            <Flex gap={2} wrap="wrap">
              <Badge borderRadius="999px" px={3} py={1} fontSize="xs" fontWeight="800" colorPalette="cyan">
                {selectedAccount.paymentMerchant}
              </Badge>
              <Badge borderRadius="999px" px={3} py={1} fontSize="xs" fontWeight="800" colorPalette="gray">
                {selectedAccount.paymentCurrency}
              </Badge>
              {selectedAccount.tapToPayEnabled ? (
                <Badge borderRadius="999px" px={3} py={1} fontSize="xs" fontWeight="800" colorPalette="green">
                  Tap To Pay
                </Badge>
              ) : null}
            </Flex>

            <Text fontSize="sm" color="text.secondary">
              This selection stays attached to the event so payment processing can reuse the same billing target.
            </Text>
          </Stack>
        ) : null}

        <Field.Root invalid={Boolean(paymentMethodsError)}>
          <StepFieldLabel label="Payment methods" isRequired />

          {!selectedAccount ? (
            <Box borderRadius="18px" border="1px dashed" borderColor="gray.200" bg="gray.50" p={5}>
              <Text fontSize="sm" fontWeight="700" color="gray.900">
                Select a payment account to load methods
              </Text>
              <Text mt={1} fontSize="sm" color="gray.600">
                The available payment methods will appear here once the account is chosen.
              </Text>
            </Box>
          ) : isMethodsLoading ? (
            <PaymentMethodsSkeleton />
          ) : paymentMethods.length > 0 ? (
            <SimpleGrid columns={{ base: 1, sm: 2, xl: 3 }} gap={3}>
              {paymentMethods.map((method) => {
                const isSelected = selectedPaymentMethods.includes(method.value)

                return (
                  <Button
                    key={method.value}
                    type="button"
                    variant="outline"
                    minH="84px"
                    px={4}
                    py={3}
                    justifyContent="flex-start"
                    alignItems="center"
                    textAlign="left"
                    borderRadius="20px"
                    borderWidth="2px"
                    borderColor={isSelected ? "brand.500" : "gray.200"}
                    bg={isSelected ? "brand.50" : "white"}
                    boxShadow={isSelected ? "0 10px 24px rgba(117, 81, 255, 0.12)" : "none"}
                    onClick={() => togglePaymentMethod(method.value)}
                    aria-pressed={isSelected}
                    _hover={{
                      borderColor: isSelected ? "brand.500" : "brand.200",
                      bg: isSelected ? "brand.50" : "gray.50",
                    }}
                    _active={{ transform: "translateY(0)" }}
                  >
                    <Flex align="center" gap={3} w="full">
                      <Flex
                        w="28px"
                        h="28px"
                        borderRadius="full"
                        align="center"
                        justify="center"
                        border="1px solid"
                        borderColor={isSelected ? "brand.500" : "gray.300"}
                        bg={isSelected ? "brand.500" : "white"}
                        color={isSelected ? "white" : "transparent"}
                        flexShrink={0}
                      >
                        <Check size={14} />
                      </Flex>

                      <Box minW={0} flex={1}>
                        <Text fontSize="sm" fontWeight="800" color="gray.900" lineHeight={1.3}>
                          {method.text}
                        </Text>
                      </Box>
                    </Flex>
                  </Button>
                )
              })}
            </SimpleGrid>
          ) : (
            <Box borderRadius="18px" border="1px dashed" borderColor="gray.200" bg="gray.50" p={5}>
              <Text fontSize="sm" fontWeight="700" color="gray.900">
                No payment methods available
              </Text>
              <Text mt={1} fontSize="sm" color="gray.600">
                The selected payment account does not expose any supported methods.
              </Text>
            </Box>
          )}

          {paymentMethodsError ? <Field.ErrorText>{paymentMethodsError}</Field.ErrorText> : null}
        </Field.Root>

        <Text fontSize="sm" color="text.secondary">
          This selection stays attached to the event so every later step can reuse the same billing target.
        </Text>
      </Stack>
    </Stack>
  )
}

function PaymentAccountStepSkeleton() {
  return (
    <Stack gap={5}>
      <Stack gap={3}>
        <Skeleton height="18px" width="160px" />
        <Skeleton height="46px" borderRadius="14px" />
        <SkeletonText noOfLines={2} width="80%" />
      </Stack>
      <Stack gap={3}>
        <Skeleton height="18px" width="160px" />
        <Box borderRadius="18px" border="1px dashed" borderColor="gray.200" bg="gray.50" p={5}>
          <SkeletonText noOfLines={2} width="75%" />
        </Box>
      </Stack>
      <Stack gap={3}>
        <Skeleton height="18px" width="170px" />
        <SimpleGrid columns={{ base: 1, sm: 2, xl: 3 }} gap={3}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} height="84px" borderRadius="20px" />
          ))}
        </SimpleGrid>
      </Stack>
      <SkeletonText noOfLines={2} width="70%" />
    </Stack>
  )
}

function PaymentMethodsSkeleton() {
  return (
    <SimpleGrid columns={{ base: 1, sm: 2, xl: 3 }} gap={3}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} height="84px" borderRadius="20px" />
      ))}
    </SimpleGrid>
  )
}
