import type { DiscountCouponListItem, DiscountCouponTypeValue } from "@/api/discountCoupons"

export type DiscountCouponDraft = {
  code: string
  discountType: DiscountCouponTypeValue
  discountValue: string
  maxDiscountAmount: string
  totalCoupons: string
  isActive: boolean
}

export type DiscountCouponDraftErrors = Partial<Record<keyof DiscountCouponDraft, string>>

export function formatDiscountAmount(coupon: DiscountCouponListItem) {
  const amount = coupon.discountValue.toFixed(2)
  return coupon.discountType === "Percentage" ? `${amount}%` : `$${amount}`
}

export function formatDiscountTypeLabel(discountType: DiscountCouponTypeValue) {
  return discountType === "Percentage" ? "%" : "$"
}

export function getDiscountTypeHelperText(discountType: DiscountCouponTypeValue) {
  return discountType === "Percentage" ? "Discount by percentage" : "Discount by amount"
}

export function getDefaultCouponDraft(): DiscountCouponDraft {
  return {
    code: "",
    discountType: "FixedAmount",
    discountValue: "",
    maxDiscountAmount: "",
    totalCoupons: "",
    isActive: true,
  }
}

export function isLocalCoupon(coupon: DiscountCouponListItem) {
  return coupon.uniqueId.startsWith("local-")
}

export function convertCouponToDraft(coupon: DiscountCouponListItem): DiscountCouponDraft {
  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue.toString(),
    maxDiscountAmount: coupon.maxDiscountAmount?.toString() ?? "",
    totalCoupons: (coupon.totalCoupons ?? "").toString(),
    isActive: coupon.isActive,
  }
}

export function buildGeneratedCouponCode(draft: DiscountCouponDraft) {
  const prefixes = ["SAVE", "DEAL", "PROMO", "BONUS", "FLASH", "PERK", "VIP", "OFFER"]
  const discountValue = Number(draft.discountValue)
  const normalizedValue =
    Number.isFinite(discountValue) && discountValue > 0 ? String(discountValue).replace(/[^0-9]/g, "") : ""
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)] ?? "SAVE"
  const suffix = draft.discountType === "Percentage" ? "PCT" : "OFF"
  const randomToken = Math.random().toString(36).slice(2, 6).toUpperCase()

  return [prefix, normalizedValue, suffix, randomToken].filter(Boolean).join("").slice(0, 16)
}

export function sanitizeCouponCode(value: string) {
  return value.replace(/\s+/g, "").toUpperCase().slice(0, 16)
}

export function validateCouponDraft(draft: DiscountCouponDraft) {
  const errors: DiscountCouponDraftErrors = {}
  const code = draft.code.trim()
  const discountValue = Number(draft.discountValue)
  const maxDiscountAmount = draft.maxDiscountAmount.trim() ? Number(draft.maxDiscountAmount) : null
  const totalCoupons = Number(draft.totalCoupons)

  if (!code) {
    errors.code = "Code is required."
  } else if (/\s/.test(code)) {
    errors.code = "Code cannot contain spaces."
  } else if (code.length > 16) {
    errors.code = "Code cannot exceed 16 characters."
  }

  if (!draft.discountType) {
    errors.discountType = "Discount type is required."
  }

  if (!draft.discountValue.trim() || !Number.isFinite(discountValue) || discountValue <= 0) {
    errors.discountValue = "Discount value must be greater than zero."
  } else if (draft.discountType === "Percentage" && discountValue > 100) {
    errors.discountValue = "Percentage discount value cannot exceed 100."
  }

  if (draft.discountType === "Percentage" && maxDiscountAmount !== null && !Number.isFinite(maxDiscountAmount)) {
    errors.maxDiscountAmount = "Max discount must be a valid number."
  } else if (draft.discountType === "Percentage" && maxDiscountAmount !== null && maxDiscountAmount < 0) {
    errors.maxDiscountAmount = "Max discount cannot be negative."
  }

  if (
    !draft.totalCoupons.trim() ||
    !Number.isFinite(totalCoupons) ||
    !Number.isInteger(totalCoupons) ||
    totalCoupons <= 0
  ) {
    errors.totalCoupons = "Total coupons must be greater than zero."
  }

  return errors
}
