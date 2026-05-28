import { useState } from "react"
import {
  Box,
  Button,
  Field,
  Flex,
  Heading,
  Input,
  Text,
  Grid,
} from "@chakra-ui/react"
import { Link, useNavigate } from "react-router-dom"
import { Mail, Lock, User, Building2, Zap } from "lucide-react"

export function Register() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: "", company: "", email: "", password: "", confirm: "" })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    setLoading(false)
    navigate("/dashboard")
  }

  const inputStyles = {
    borderRadius: "12px",
    bg: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    color: "white",
    fontSize: "sm",
    _placeholder: { color: "rgba(255,255,255,0.4)" },
    _focus: { borderColor: "brand.400", boxShadow: "0 0 0 1px #7551FF" },
  }

  return (
    <Flex minH="100vh" bg="navy.950" align="center" justify="center" p={6}>
      <Box
        w="full"
        maxW="520px"
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

        <Heading fontSize="2xl" fontWeight="800" color="white" mb={1}>
          Create your account
        </Heading>
        <Text fontSize="sm" color="navy.300" mb={8}>
          Start managing events at scale. Free for 14 days.
        </Text>

        <Box as="form" onSubmit={handleSubmit}>
          <Grid templateColumns="1fr 1fr" gap={4} mb={4}>
            <Field.Root>
              <Field.Label fontSize="xs" fontWeight="700" color="navy.300" textTransform="uppercase" letterSpacing="0.05em">
                Full Name
              </Field.Label>
              <Box position="relative">
                <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="navy.400" zIndex={1}>
                  <User size={14} />
                </Box>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jordan Blake"
                  pl="2.5rem"
                  required
                  {...inputStyles}
                />
              </Box>
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="xs" fontWeight="700" color="navy.300" textTransform="uppercase" letterSpacing="0.05em">
                Company
              </Field.Label>
              <Box position="relative">
                <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="navy.400" zIndex={1}>
                  <Building2 size={14} />
                </Box>
                <Input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Acme Corp"
                  pl="2.5rem"
                  {...inputStyles}
                />
              </Box>
            </Field.Root>
          </Grid>

          <Field.Root mb={4}>
            <Field.Label fontSize="xs" fontWeight="700" color="navy.300" textTransform="uppercase" letterSpacing="0.05em">
              Work Email
            </Field.Label>
            <Box position="relative">
              <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="navy.400" zIndex={1}>
                <Mail size={14} />
              </Box>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.com"
                pl="2.5rem"
                required
                {...inputStyles}
              />
            </Box>
          </Field.Root>

          <Grid templateColumns="1fr 1fr" gap={4} mb={8}>
            <Field.Root>
              <Field.Label fontSize="xs" fontWeight="700" color="navy.300" textTransform="uppercase" letterSpacing="0.05em">
                Password
              </Field.Label>
              <Box position="relative">
                <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="navy.400" zIndex={1}>
                  <Lock size={14} />
                </Box>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 8 characters"
                  pl="2.5rem"
                  required
                  {...inputStyles}
                />
              </Box>
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="xs" fontWeight="700" color="navy.300" textTransform="uppercase" letterSpacing="0.05em">
                Confirm
              </Field.Label>
              <Box position="relative">
                <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="navy.400" zIndex={1}>
                  <Lock size={14} />
                </Box>
                <Input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  placeholder="Repeat password"
                  pl="2.5rem"
                  required
                  {...inputStyles}
                />
              </Box>
            </Field.Root>
          </Grid>

          <Button
            type="submit"
            w="full"
            h="46px"
            borderRadius="12px"
            fontWeight="700"
            fontSize="sm"
            loading={loading}
            loadingText="Creating account..."
            style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)", color: "white" }}
            _hover={{ opacity: 0.9, transform: "translateY(-1px)" }}
            transition="all 0.2s ease"
          >
            Create Account
          </Button>
        </Box>

        <Text fontSize="sm" color="navy.400" textAlign="center" mt={6}>
          Already have an account?{" "}
          <Link to="/auth/login">
            <Text as="span" color="brand.400" fontWeight="700" _hover={{ color: "brand.300" }}>
              Sign in
            </Text>
          </Link>
        </Text>

        <Text fontSize="xs" color="navy.600" textAlign="center" mt={4}>
          By creating an account you agree to our{" "}
          <Text as="span" color="brand.500" cursor="pointer">Terms of Service</Text>
          {" "}and{" "}
          <Text as="span" color="brand.500" cursor="pointer">Privacy Policy</Text>
        </Text>
      </Box>
    </Flex>
  )
}
