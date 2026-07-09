export const CONTROL_FOCUS_RING = {
  borderColor: "brand.400",
  boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.16)",
  outline: "none",
}

export const CONTROL_INPUT_BASE = {
  h: "46px",
  px: 4,
  borderRadius: "16px",
  borderWidth: "1px",
  borderColor: "secondaryGray.100",
  bg: "white",
  color: "navy.700",
  fontSize: "sm",
  fontWeight: "500",
  letterSpacing: "0.01em",
  transition: "all 0.18s ease",
  _placeholder: { color: "secondaryGray.500" },
  _hover: { borderColor: "secondaryGray.300" },
  _focusVisible: CONTROL_FOCUS_RING,
  _focus: CONTROL_FOCUS_RING,
  _dark: {
    bg: "navy.800",
    borderColor: "navy.600",
    color: "white",
    _placeholder: { color: "navy.300" },
    _hover: { borderColor: "navy.500" },
  },
}

export const CONTROL_TEXTAREA_BASE = {
  ...CONTROL_INPUT_BASE,
  h: "auto",
  minH: "120px",
  py: 3,
  resize: "vertical",
}

export const CONTROL_SELECT_TRIGGER = {
  borderWidth: "1px",
  borderColor: "secondaryGray.100",
  bg: "white",
  color: "navy.700",
  fontSize: "sm",
  fontWeight: "500",
  letterSpacing: "0.01em",
  transition: "all 0.18s ease",
  _placeholder: { color: "secondaryGray.500" },
  _hover: { borderColor: "secondaryGray.300" },
  _focusVisible: CONTROL_FOCUS_RING,
  _focus: CONTROL_FOCUS_RING,
  _dark: {
    bg: "navy.800",
    borderColor: "navy.600",
    color: "white",
    _placeholder: { color: "navy.300" },
    _hover: { borderColor: "navy.500" },
  },
  pr: 10,
  cursor: "pointer",
  _disabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
}

export const CONTROL_SELECT_CONTENT = {
  bg: "card.bg",
  borderWidth: "1px",
  borderColor: "border.subtle",
  borderRadius: "18px",
  boxShadow: "0px 24px 60px rgba(112, 144, 176, 0.18), 0px 0px 0px 1px rgba(112, 144, 176, 0.08)",
  _dark: {
    boxShadow: "0px 24px 60px rgba(0,0,0,0.42), 0px 0px 0px 1px rgba(255,255,255,0.06)",
  },
  p: 2,
  minW: "var(--reference-width)",
  zIndex: 1500,
}

export const CONTROL_SELECT_ITEM = {
  px: 3,
  py: 2.5,
  borderRadius: "12px",
  fontSize: "sm",
  color: "navy.700",
  _dark: { color: "secondaryGray.100" },
  _disabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
  _highlighted: {
    bg: "secondaryGray.300",
    _dark: { bg: "navy.700" },
    outline: "none",
  },
  _checked: {
    color: "brand.500",
    _dark: { color: "brand.400" },
    fontWeight: "600",
  },
  cursor: "pointer",
  transition: "background 0.1s ease",
}

export const CONTROL_BUTTON_BASE = {
  h: "46px",
  minH: "46px",
  px: 6,
  borderRadius: "16px",
  fontWeight: "700",
  letterSpacing: "0.01em",
  transition: "all 0.18s ease",
  _disabled: {
    opacity: 0.45,
    transform: "none",
    boxShadow: "none",
    cursor: "not-allowed",
  },
}

export const CONTROL_BUTTON_OUTLINE = {
  ...CONTROL_BUTTON_BASE,
  borderWidth: "1px",
  borderColor: "secondaryGray.200",
  bg: "white",
  color: "navy.700",
  _hover: {
    bg: "secondaryGray.300",
    borderColor: "secondaryGray.300",
    _dark: { bg: "navy.700", borderColor: "navy.600" },
  },
  _dark: {
    borderColor: "navy.600",
    color: "secondaryGray.300",
    bg: "navy.800",
  },
}

export const CONTROL_BUTTON_PRIMARY = {
  ...CONTROL_BUTTON_BASE,
  color: "white",
  boxShadow: "0 12px 24px rgba(66, 42, 251, 0.22)",
  _hover: {
    transform: "translateY(-1px)",
    boxShadow: "0 16px 28px rgba(66, 42, 251, 0.28)",
  },
  _active: { transform: "translateY(0)" },
}
