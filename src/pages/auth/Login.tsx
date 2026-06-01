import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  Grid,
  Heading,
  Input,
  Skeleton,
  SkeletonText,
  Separator,
  Text,
} from "@chakra-ui/react"
import { Link, useNavigate } from "react-router-dom"
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"
import { auth } from "@/lib/auth"
import { loginUser } from "@/api/auth"
import { useAuthSession } from "@/hooks/useAuthSession"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { sessionDataToUser } from "@/lib/auth"

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

const STAT_CARDS = [
  { label: "Events managed", value: "1,240+", accent: "#7551FF" },
  { label: "Average uptime", value: "99.9%", accent: "#3CB371" },
  { label: "Teams onboarded", value: "180+", accent: "#2196F3" },
]

const TRUST_MARKERS = [
  { icon: <ShieldCheck size={12} />, label: "SOC 2 ready" },
  { icon: <Globe size={12} />, label: "GDPR aligned" },
  { icon: <TrendingUp size={12} />, label: "Audit-friendly workflows" },
]

const CONTROL_HEIGHT = "52px"

function AuthLoadingState() {
  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      px={6}
      bg="linear-gradient(180deg, #F7F9FC 0%, #EEF2FF 45%, #F8FAFC 100%)"
    >
      <Box
        w="full"
        maxW="460px"
        bg="white"
        borderRadius="24px"
        border="1px solid"
        borderColor="gray.200"
        boxShadow="0 24px 60px rgba(15, 23, 42, 0.12)"
        p={{ base: 6, md: 8 }}
      >
        <Skeleton height="42px" width="42px" borderRadius="14px" mb={8} />
        <Skeleton height="28px" width="220px" mb={3} />
        <SkeletonText noOfLines={2} mb={8} />
        <Skeleton height="52px" borderRadius="14px" mb={3} />
        <Skeleton height="52px" borderRadius="14px" mb={3} />
        <Skeleton height="52px" borderRadius="14px" mb={6} />
        <Skeleton height="52px" borderRadius="14px" />
      </Box>
    </Flex>
  )
}

function BrandMark() {
  return (
    <Flex
      w="42px"
      h="42px"
      borderRadius="14px"
      align="center"
      justify="center"
      bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)"
      boxShadow="0 12px 30px rgba(66, 42, 251, 0.25)"
      flexShrink={0}
    >
      <Zap size={20} color="white" fill="white" />
    </Flex>
  )
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: string
}) {
  return (
    <Box
      borderRadius="18px"
      border="1px solid"
      borderColor="rgba(117, 81, 255, 0.12)"
      bg="rgba(255,255,255,0.72)"
      backdropFilter="blur(14px)"
      p={4}
      boxShadow="0 16px 40px rgba(15, 23, 42, 0.08)"
    >
      <Text fontSize="11px" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
        {label}
      </Text>
      <Text mt={1.5} fontSize="2xl" fontWeight="800" color="gray.900" letterSpacing="-0.03em">
        {value}
      </Text>
      <Box mt={3} h="4px" borderRadius="full" bg="gray.100" overflow="hidden">
        <Box h="full" w="72%" borderRadius="full" bg={accent} />
      </Box>
    </Box>
  )
}

function TrustBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Flex
      align="center"
      gap={1.5}
      borderRadius="999px"
      px={3}
      py={1.5}
      bg="rgba(15, 23, 42, 0.05)"
      color="gray.700"
      fontSize="11px"
      fontWeight="700"
    >
      <Box color="brand.500">{icon}</Box>
      {label}
    </Flex>
  )
}

export function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const sessionQuery = useAuthSession()
  const currentUser = auth.getUser() ?? (sessionQuery.data ? sessionDataToUser(sessionQuery.data) : null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  useEffect(() => {
    if (currentUser) {
      navigate(APP_ROUTES.dashboard, { replace: true })
    }
  }, [currentUser, navigate])

  if (sessionQuery.isLoading && !currentUser) {
    return <AuthLoadingState />
  }

  async function onSubmit(data: LoginFormValues) {
    setSubmitError(null)

    try {
      const result = await loginUser({
        userName: data.email,
        password: data.password,
      })

      if ("requiresTwoFactor" in result) {
        navigate(APP_ROUTES.auth.twoFactor(result.twoFaToken), {
          state: { email: data.email },
        })
        return
      }

      auth.setSession(result)
      navigate(APP_ROUTES.dashboard, { replace: true })
    } catch (error) {
      setSubmitError(extractApiError(error))
    }
  }

  const inputStyles = {
    w: "full",
    h: CONTROL_HEIGHT,
    borderRadius: "14px",
    bg: "white",
    borderColor: "gray.200",
    color: "gray.900",
    fontSize: "sm",
    px: 4,
    _placeholder: { color: "gray.400" },
    _hover: { borderColor: "gray.300" },
    _focus: {
      borderColor: "brand.400",
      boxShadow: "0 0 0 4px rgba(117, 81, 255, 0.12)",
    },
    _focusVisible: { outline: "none" },
  }

  const invalidStyles = {
    borderColor: "red.400",
    _focus: {
      borderColor: "red.400",
      boxShadow: "0 0 0 4px rgba(238, 93, 80, 0.12)",
    },
  }

  return (
    <Flex
      minH="100vh"
      bg="linear-gradient(180deg, #F7F9FC 0%, #EEF2FF 45%, #F8FAFC 100%)"
      color="gray.900"
    >
      <Flex
        flex="1 1 0"
        display={{ base: "none", xl: "flex" }}
        direction="column"
        justify="space-between"
        p={12}
        position="relative"
        overflow="hidden"
        bg="linear-gradient(160deg, #F8FAFF 0%, #EEF2FF 55%, #EDE9FF 100%)"
        borderRight="1px solid"
        borderColor="rgba(117, 81, 255, 0.08)"
      >
        <Box
          position="absolute"
          top="-8%"
          right="-10%"
          w="360px"
          h="360px"
          borderRadius="full"
          bg="radial-gradient(circle, rgba(117,81,255,0.18) 0%, rgba(117,81,255,0) 70%)"
        />
        <Box
          position="absolute"
          bottom="-12%"
          left="-8%"
          w="420px"
          h="420px"
          borderRadius="full"
          bg="radial-gradient(circle, rgba(33,150,243,0.12) 0%, rgba(33,150,243,0) 70%)"
        />

        <Flex align="center" gap={3} position="relative" zIndex={1}>
          <BrandMark />
          <Box>
            <Text fontSize="lg" fontWeight="800" letterSpacing="-0.03em" lineHeight={1}>
              ideali<Text as="span" color="brand.500">events</Text>
            </Text>
            <Text fontSize="11px" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em" mt={1}>
              Enterprise event operations
            </Text>
          </Box>
        </Flex>

        <Box maxW="520px" position="relative" zIndex={1}>
          <Badge
            variant="subtle"
            colorPalette="brand"
            borderRadius="999px"
            px={3}
            py={1}
            mb={4}
            fontSize="10px"
            fontWeight="800"
            textTransform="uppercase"
            letterSpacing="0.08em"
          >
            Built for scale
          </Badge>

          <Heading
            fontSize={{ xl: "4xl", "2xl": "5xl" }}
            fontWeight="800"
            color="gray.900"
            letterSpacing="-0.04em"
            lineHeight={1.05}
            maxW="12ch"
          >
            Enterprise event operations with a clean command center.
          </Heading>
          <Text
            mt={5}
            fontSize="lg"
            color="gray.600"
            lineHeight={1.8}
            maxW="48ch"
          >
            Manage events, teams, schedules, and performance from a polished workspace designed for modern SaaS teams.
          </Text>

          <Grid templateColumns="repeat(3, minmax(0, 1fr))" gap={4} mt={8}>
            {STAT_CARDS.map((stat) => (
              <MetricCard key={stat.label} {...stat} />
            ))}
          </Grid>

          <Flex gap={2} mt={6} wrap="wrap">
            {TRUST_MARKERS.map((marker) => (
              <TrustBadge key={marker.label} icon={marker.icon} label={marker.label} />
            ))}
          </Flex>
        </Box>

        <Box
          position="relative"
          zIndex={1}
          maxW="460px"
          borderRadius="24px"
          border="1px solid"
          borderColor="rgba(117, 81, 255, 0.12)"
          bg="rgba(255,255,255,0.7)"
          backdropFilter="blur(18px)"
          p={5}
          boxShadow="0 20px 55px rgba(15, 23, 42, 0.1)"
        >
          <Flex align="center" justify="space-between" mb={4}>
            <Flex align="center" gap={2}>
              <Box
                w="34px"
                h="34px"
                borderRadius="12px"
                bg="brand.500"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="white"
              >
                <Sparkles size={16} />
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="700" color="gray.900">
                  Trusted by enterprise teams
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Clear workflows, measurable outcomes
                </Text>
              </Box>
            </Flex>
            <CheckCircle2 size={18} color="#3CB371" />
          </Flex>
          <Text fontSize="sm" color="gray.700" lineHeight={1.7}>
            “Ideali gave us a calmer, more consistent login and workspace experience for every team member.”
          </Text>
        </Box>
      </Flex>

      <Flex
        flex="1 1 0"
        w={{ base: "full", xl: "50%" }}
        minW={{ xl: "50%" }}
        bg="white"
        borderLeft={{ base: "none", xl: "1px solid" }}
        borderColor="gray.200"
        align="center"
        justify="center"
        p={{ base: 6, md: 10 }}
      >
        <Box w="full" maxW="400px">
          <Flex align="center" gap={2} mb={8}>
            <BrandMark />
            <Box display={{ base: "block", xl: "none" }}>
              <Text fontSize="lg" fontWeight="800" letterSpacing="-0.03em" lineHeight={1}>
                ideali<Text as="span" color="brand.500">events</Text>
              </Text>
              <Text fontSize="11px" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em" mt={1}>
                Enterprise event operations
              </Text>
            </Box>
          </Flex>

          <Heading fontSize="2xl" fontWeight="800" color="gray.900" letterSpacing="-0.03em">
            Welcome back
          </Heading>
          <Text mt={2} fontSize="sm" color="gray.600" lineHeight={1.6}>
            Sign in to your workspace to manage events, analytics, and your team.
          </Text>

          {submitError && (
            <Box
              mt={6}
              borderRadius="14px"
              border="1px solid"
              borderColor="red.200"
              bg="red.50"
              px={4}
              py={3}
            >
              <Text fontSize="sm" color="red.700" fontWeight="600">
                {submitError}
              </Text>
            </Box>
          )}

          <Flex direction="column" gap={3} mt={8} mb={6}>
            <Button
              type="button"
              w="full"
              h={CONTROL_HEIGHT}
              borderRadius="14px"
              border="1px solid"
              borderColor="gray.200"
              bg="white"
              color="gray.800"
              fontWeight="700"
              fontSize="sm"
              px={4}
              gap={2.5}
              justifyContent="flex-start"
              _hover={{ bg: "gray.50", borderColor: "gray.300" }}
              transition="all 0.15s ease"
              onClick={() => setSubmitError("Social sign-in is not wired yet. Use email and password instead.")}
            >
              <GoogleIcon />
              Continue with Google
            </Button>

            <Button
              type="button"
              w="full"
              h={CONTROL_HEIGHT}
              borderRadius="14px"
              border="1px solid"
              borderColor="gray.200"
              bg="white"
              color="gray.800"
              fontWeight="700"
              fontSize="sm"
              px={4}
              gap={2.5}
              justifyContent="flex-start"
              _hover={{ bg: "gray.50", borderColor: "gray.300" }}
              transition="all 0.15s ease"
              onClick={() => setSubmitError("Social sign-in is not wired yet. Use email and password instead.")}
            >
              <MicrosoftIcon />
              Continue with Microsoft
            </Button>

            <Button
              type="button"
              w="full"
              h={CONTROL_HEIGHT}
              borderRadius="14px"
              border="1px solid"
              borderColor="gray.200"
              bg="gray.50"
              color="gray.700"
              fontWeight="700"
              fontSize="sm"
              px={4}
              gap={2.5}
              justifyContent="flex-start"
              _hover={{ bg: "gray.100", borderColor: "gray.300" }}
              transition="all 0.15s ease"
              onClick={() => setSubmitError("SSO / SAML is not wired yet. Use email and password instead.")}
            >
              <Building2 size={18} />
              SSO / SAML
            </Button>
          </Flex>

          <Flex align="center" gap={3} mb={6}>
            <Separator flex={1} borderColor="gray.200" />
            <Text fontSize="xs" color="gray.500" fontWeight="700" letterSpacing="0.08em">
              OR USE EMAIL
            </Text>
            <Separator flex={1} borderColor="gray.200" />
          </Flex>

          <Box as="form" onSubmit={handleSubmit(onSubmit)}>
            <Field.Root mb={4} invalid={!!errors.email}>
              <Field.Label fontSize="xs" fontWeight="800" color="gray.700" textTransform="uppercase" letterSpacing="0.08em" mb={1.5}>
                Work Email
              </Field.Label>
              <Box position="relative">
                <Box
                  position="absolute"
                  left={3.5}
                  top="50%"
                  transform="translateY(-50%)"
                  color={errors.email ? "red.500" : "gray.400"}
                  pointerEvents="none"
                >
                  <Mail size={16} />
                </Box>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  autoFocus
                  pl="2.75rem"
                  {...register("email")}
                  {...inputStyles}
                  {...(errors.email ? invalidStyles : {})}
                />
              </Box>
              {errors.email && (
                <Field.ErrorText mt={1.5} fontSize="xs" color="red.500">
                  {errors.email.message}
                </Field.ErrorText>
              )}
            </Field.Root>

            <Field.Root mb={4} invalid={!!errors.password}>
              <Flex align="center" justify="space-between" mb={1.5}>
                <Field.Label fontSize="xs" fontWeight="800" color="gray.700" textTransform="uppercase" letterSpacing="0.08em">
                  Password
                </Field.Label>
                <Link to={APP_ROUTES.auth.forgotPassword}>
                  <Text
                    fontSize="xs"
                    color="brand.500"
                    fontWeight="700"
                    _hover={{ color: "brand.600", textDecoration: "underline" }}
                  >
                    Forgot password?
                  </Text>
                </Link>
              </Flex>
              <Box position="relative">
                <Box
                  position="absolute"
                  left={3.5}
                  top="50%"
                  transform="translateY(-50%)"
                  color={errors.password ? "red.500" : "gray.400"}
                  pointerEvents="none"
                >
                  <Lock size={16} />
                </Box>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  pl="2.75rem"
                  pr="3rem"
                  {...register("password")}
                  {...inputStyles}
                  {...(errors.password ? invalidStyles : {})}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  position="absolute"
                  right={1}
                  top="50%"
                  transform="translateY(-50%)"
                  h="34px"
                  minW="34px"
                  borderRadius="10px"
                  color="gray.500"
                  _hover={{ bg: "gray.100", color: "gray.700" }}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </Box>
              {errors.password && (
                <Field.ErrorText mt={1.5} fontSize="xs" color="red.500">
                  {errors.password.message}
                </Field.ErrorText>
              )}
            </Field.Root>

            <Button
              type="submit"
              w="full"
              h="50px"
              borderRadius="14px"
              fontWeight="800"
              fontSize="sm"
              disabled={isSubmitting}
              loading={isSubmitting}
              loadingText="Signing in..."
              color="white"
              bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)"
              boxShadow="0 16px 30px rgba(66, 42, 251, 0.24)"
              _hover={{ opacity: 0.96, transform: "translateY(-1px)" }}
              _active={{ transform: "translateY(0)" }}
              _focusVisible={{ outline: "2px solid #7551FF", outlineOffset: "3px" }}
              transition="all 0.2s ease"
            >
              Sign in
            </Button>
          </Box>

          <Text fontSize="sm" color="gray.600" textAlign="center" mt={6}>
            New to Ideali?{" "}
            <Link to={APP_ROUTES.auth.register}>
              <Text as="span" color="brand.500" fontWeight="800" _hover={{ textDecoration: "underline", color: "brand.600" }}>
                Start your free trial
              </Text>
            </Link>
          </Text>

          <Flex justify="center" gap={4} pt={6} mt={6} borderTop="1px solid" borderColor="gray.200" wrap="wrap">
            {[
              { icon: <ShieldCheck size={11} />, label: "Enterprise-grade security" },
              { icon: <Users size={11} />, label: "Role-based access" },
              { icon: <Globe size={11} />, label: "Global teams supported" },
            ].map((item) => (
              <Flex key={item.label} align="center" gap={1.5} color="gray.500">
                {item.icon}
                <Text fontSize="10px" fontWeight="700" letterSpacing="0.04em">
                  {item.label}
                </Text>
              </Flex>
            ))}
          </Flex>
        </Box>
      </Flex>
    </Flex>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022" />
      <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00" />
      <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF" />
      <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900" />
    </svg>
  )
}
