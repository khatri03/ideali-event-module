import { useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useFormContext } from "react-hook-form"
import { useParams } from "react-router-dom"
import type { EventWizardPaymentAccountResponse } from "@/api/events"
import {
  fetchOrganizerPaymentAccountSelectionItems,
  fetchOrganizerPaymentMethods,
  type OrganizerPaymentAccountSelectionItem,
  type OrganizerPaymentMethodOption,
} from "@/api/paymentAccounts"
import { extractApiError } from "@/utils/errors"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"
import { useEventWizardDraft } from "./useEventWizardDraft"

export interface EventPaymentAccountStepState {
  paymentAccounts: OrganizerPaymentAccountSelectionItem[]
  selectedPaymentAccountUniqueId: string
  selectedAccount: OrganizerPaymentAccountSelectionItem | null
  paymentMethods: OrganizerPaymentMethodOption[]
  selectedPaymentMethods: number[]
  isLoading: boolean
  isMethodsLoading: boolean
  error: string
  reload: () => void
  selectPaymentAccount: (paymentAccountUniqueId: string) => void
  togglePaymentMethod: (paymentMethodId: number) => void
}

export function useEventPaymentAccountStep(): EventPaymentAccountStepState {
  const { eventId } = useParams<{ eventId?: string }>()
  const { setValue, watch } = useFormContext<EventWizardValues>()
  const selectedPaymentAccountUniqueId = watch("paymentAccountId")
  const selectedPaymentMethods = watch("paymentMethods")

  const paymentAccountStepQuery = useEventWizardDraft(eventId, "payment-account")
  const organizerPaymentAccountsQuery = useQuery({
    queryKey: ["organizer-payment-accounts", { type: "selection-items" }],
    queryFn: fetchOrganizerPaymentAccountSelectionItems,
    retry: false,
  })
  const paymentMethodsQuery = useQuery({
    queryKey: ["organizer-payment-methods", { paymentAccountUniqueId: selectedPaymentAccountUniqueId }],
    queryFn: () => fetchOrganizerPaymentMethods(selectedPaymentAccountUniqueId),
    enabled: Boolean(selectedPaymentAccountUniqueId.trim()),
    retry: false,
  })

  useEffect(() => {
    const draftData = paymentAccountStepQuery.data as EventWizardPaymentAccountResponse | undefined
    if (!draftData) {
      return
    }

    setValue("paymentAccountId", draftData.paymentAccountUniqueId ?? "", {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    })
    setValue("paymentMethods", draftData.paymentMethods ?? [], {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    })
  }, [paymentAccountStepQuery.data, setValue])

  useEffect(() => {
    if (!selectedPaymentAccountUniqueId) {
      setValue("paymentMethods", [], {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      })
      return
    }

    const paymentMethods = paymentMethodsQuery.data
    if (!paymentMethods) {
      return
    }

    const availableMethodIds = paymentMethods.map((item) => item.value)
    const savedPaymentAccountUniqueId = (paymentAccountStepQuery.data as EventWizardPaymentAccountResponse | undefined)?.paymentAccountUniqueId ?? ""
    const savedPaymentMethods = (paymentAccountStepQuery.data as EventWizardPaymentAccountResponse | undefined)?.paymentMethods ?? []
    const restoredMethods =
      selectedPaymentAccountUniqueId === savedPaymentAccountUniqueId
        ? savedPaymentMethods.filter((methodId: number) => availableMethodIds.includes(methodId))
        : []

    setValue("paymentMethods", restoredMethods, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    })
  }, [paymentAccountStepQuery.data, paymentMethodsQuery.data, selectedPaymentAccountUniqueId, setValue])

  const paymentAccounts = useMemo(() => organizerPaymentAccountsQuery.data ?? [], [organizerPaymentAccountsQuery.data])
  const selectedAccount = useMemo(
    () => paymentAccounts.find((account) => account.uniqueId === selectedPaymentAccountUniqueId) ?? null,
    [paymentAccounts, selectedPaymentAccountUniqueId],
  )
  const paymentMethods = paymentMethodsQuery.data ?? []
  const error =
    (paymentAccountStepQuery.isError ? extractApiError(paymentAccountStepQuery.error) : "") ||
    (organizerPaymentAccountsQuery.isError ? extractApiError(organizerPaymentAccountsQuery.error) : "") ||
    (paymentMethodsQuery.isError ? extractApiError(paymentMethodsQuery.error) : "")

  return {
    paymentAccounts,
    selectedPaymentAccountUniqueId,
    selectedAccount,
    paymentMethods,
    selectedPaymentMethods: selectedPaymentMethods ?? [],
    isLoading: paymentAccountStepQuery.isLoading || organizerPaymentAccountsQuery.isLoading,
    isMethodsLoading: paymentMethodsQuery.isLoading,
    error,
    reload: () => {
      void Promise.all([
        paymentAccountStepQuery.refetch(),
        organizerPaymentAccountsQuery.refetch(),
        selectedPaymentAccountUniqueId.trim() ? paymentMethodsQuery.refetch() : Promise.resolve(),
      ])
    },
    selectPaymentAccount: (paymentAccountUniqueId: string) => {
      setValue("paymentAccountId", paymentAccountUniqueId, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    },
    togglePaymentMethod: (paymentMethodId: number) => {
      const currentValues = selectedPaymentMethods ?? []
      setValue(
        "paymentMethods",
        currentValues.includes(paymentMethodId)
          ? currentValues.filter((methodId) => methodId !== paymentMethodId)
          : [...currentValues, paymentMethodId],
        {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        },
      )
    },
  }
}
