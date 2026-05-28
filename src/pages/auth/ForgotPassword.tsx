import { useState } from "react"
import {
  Box,
  Button,
  Field,
  Flex,
  Heading,
  Input,
  Text,
} from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { Mail, Zap, ArrowLeft, CheckCircle } from "lucide-react"

export function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    setLoading(false)
    setSent(true)
  }

  return (
    <Flex minH="100vh" bg="navy.950" align="center" justify="center" p={6}>
      <Box
        w="full"
        maxW="400px"
        bg="navy.900"
        borderRadius="24px"
        p={{ base: 6, md: 10 }}
        border="1px solid"
        borderColor="navy.700"
      >
        {/* Logo */}
        <Flex align="center" gap={2} mb={8}>
          <Flex
            w="36px" h="36px" borderRadius="10px" align="center" justify="center"
            style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
          >
            <Zap size={18} color="white" fill="white" />
          </Flex>
          <Text fontSize="lg" fontWeight="800" color="white">
            ideali<Text as="span" color="brand.400">events</Text>
          </Text>
        </Flex>

        {!sent ? (
          <>
            <Heading fontSize="2xl" fontWeight="800" color="white" mb={1}>
              Reset password
            </Heading>
            <Text fontSize="sm" color="navy.300" mb={8} lineHeight={1.6}>
              Enter your email and we'll send you a link to reset your password.
            </Text>

            <Box as="form" onSubmit={handleSubmit}>
              <Field.Root mb={6}>
                <Field.Label fontSize="xs" fontWeight="700" color="navy.300" textTransform="uppercase" letterSpacing="0.05em">
                  Email Address
                </Field.Label>
                <Box position="relative">
                  <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="navy.400" zIndex={1}>
                    <Mail size={14} />
                  </Box>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    pl="2.5rem"
                    required
                    borderRadius="12px"
                    bg="rgba(255,255,255,0.06)"
                    borderColor="rgba(255,255,255,0.12)"
                    color="white"
                    fontSize="sm"
                    _placeholder={{ color: "rgba(255,255,255,0.4)" }}
                    _focus={{ borderColor: "brand.400", boxShadow: "0 0 0 1px #7551FF" }}
                  />
                </Box>
              </Field.Root>

              <Button
                type="submit"
                w="full"
                h="46px"
                borderRadius="12px"
                fontWeight="700"
                fontSize="sm"
                loading={loading}
                loadingText="Sending..."
                style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)", color: "white" }}
                _hover={{ opacity: 0.9, transform: "translateY(-1px)" }}
                transition="all 0.2s ease"
              >
                Send Reset Link
              </Button>
            </Box>
          </>
        ) : (
          <Box textAlign="center">
            <Flex
              w="64px"
              h="64px"
              borderRadius="20px"
              align="center"
              justify="center"
              bg="rgba(59, 179, 113, 0.15)"
              mx="auto"
              mb={4}
            >
              <CheckCircle size={32} color="#3CB371" />
            </Flex>
            <Heading fontSize="xl" fontWeight="800" color="white" mb={2}>
              Check your inbox
            </Heading>
            <Text fontSize="sm" color="navy.300" lineHeight={1.6}>
              We sent a password reset link to{" "}
              <Text as="span" color="brand.400" fontWeight="600">{email}</Text>.
              It may take a few minutes to arrive.
            </Text>
          </Box>
        )}

        <Link to="/auth/login">
          <Flex align="center" gap={2} mt={8} color="navy.400" _hover={{ color: "brand.400" }} transition="color 0.15s">
            <ArrowLeft size={14} />
            <Text fontSize="sm" fontWeight="600">Back to sign in</Text>
          </Flex>
        </Link>
      </Box>
    </Flex>
  )
}
