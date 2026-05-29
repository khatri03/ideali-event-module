import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { z } from "zod"
import {
  Box,
  Button,
  Field,
  Flex,
  Heading,
  Input,
  Skeleton,
  SkeletonText,
  Text,
} from "@chakra-ui/react"
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react"
import { verifyTwoFactor } from "@/api/auth"
import { auth } from "@/lib/auth"
import { useAuthSession } from "@/hooks/useAuthSession"
import { extractApiError } from "@/utils/errors"

const twoFactorSchema = z.object({
  emailCode: z
    .string()
    .min(6, "Enter the 6-digit verification code")
    .max(6, "Enter the 6-digit verification code"),
})

type TwoFactorFormValues = z.infer<typeof twoFactorSchema>

interface LocationState {
  email?: string
}

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
        <Skeleton height="52px" borderRadius="14px" mb={6} />
        <Skeleton height="52px" borderRadius="14px" />
      </Box>
    </Flex>
  )
}

export function TwoFactor() {
  const navigate = useNavigate()
  const { twoFaToken } = useParams()
  const location = useLocation()
  const { email } = (location.state ?? {}) as LocationState
  const [submitError, setSubmitError] = useState<string | null>(null)
  const sessionQuery = useAuthSession()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TwoFactorFormValues>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: { emailCode: "" },
  })

  useEffect(() => {
    if (auth.isAuthenticated() || sessionQuery.data) {
      navigate("/dashboard", { replace: true })
    }
  }, [navigate, sessionQuery.data])

  if (sessionQuery.isLoading && !auth.isAuthenticated()) {
    return <AuthLoadingState />
  }

  async function onSubmit(data: TwoFactorFormValues) {
    if (!twoFaToken) {
      setSubmitError("Missing two-factor token.")
      return
    }

    setSubmitError(null)

    try {
      const result = await verifyTwoFactor(twoFaToken, data.emailCode)
      auth.setSession(result)
      navigate("/dashboard", { replace: true })
    } catch (error) {
      setSubmitError(extractApiError(error))
    }
  }

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
        <Flex align="center" gap={3} mb={8}>
          <Flex
            w="42px"
            h="42px"
            borderRadius="14px"
            align="center"
            justify="center"
            bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)"
          >
            <Zap size={20} color="white" fill="white" />
          </Flex>
          <Box>
            <Text fontSize="lg" fontWeight="800" letterSpacing="-0.03em" lineHeight={1}>
              ideali<Text as="span" color="brand.500">events</Text>
            </Text>
            <Text fontSize="11px" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em" mt={1}>
              Two-factor authentication
            </Text>
          </Box>
        </Flex>

        <Heading fontSize="2xl" fontWeight="800" color="gray.900" letterSpacing="-0.03em">
          Verify your sign-in
        </Heading>
        <Text mt={2} fontSize="sm" color="gray.600" lineHeight={1.6}>
          Enter the 6-digit code sent to {email ?? "your email address"}.
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

        <Box as="form" onSubmit={handleSubmit(onSubmit)} mt={8}>
          <Field.Root invalid={!!errors.emailCode}>
            <Field.Label fontSize="xs" fontWeight="800" color="gray.700" textTransform="uppercase" letterSpacing="0.08em" mb={1.5}>
              Verification Code
            </Field.Label>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              textAlign="center"
              letterSpacing="0.35em"
              fontWeight="800"
              h="52px"
              borderRadius="14px"
              borderColor="gray.200"
              bg="white"
              color="gray.900"
              _focus={{ borderColor: "brand.400", boxShadow: "0 0 0 4px rgba(117, 81, 255, 0.12)" }}
              {...register("emailCode")}
            />
            {errors.emailCode && (
              <Field.ErrorText mt={1.5} fontSize="xs" color="red.500">
                {errors.emailCode.message}
              </Field.ErrorText>
            )}
          </Field.Root>

          <Button
            type="submit"
            w="full"
            h="52px"
            mt={6}
            borderRadius="14px"
            fontWeight="800"
            fontSize="sm"
            disabled={isSubmitting}
            loading={isSubmitting}
            loadingText="Verifying..."
            color="white"
            bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)"
            boxShadow="0 16px 30px rgba(66, 42, 251, 0.24)"
            _hover={{ opacity: 0.96, transform: "translateY(-1px)" }}
            _active={{ transform: "translateY(0)" }}
          >
            Verify and continue
          </Button>
        </Box>

        <Flex mt={6} align="center" gap={2} color="gray.500" justify="center">
          <ShieldCheck size={12} />
          <Text fontSize="xs" fontWeight="700" letterSpacing="0.04em">
            Secure session verification
          </Text>
          <CheckCircle2 size={12} />
        </Flex>
      </Box>
    </Flex>
  )
}
