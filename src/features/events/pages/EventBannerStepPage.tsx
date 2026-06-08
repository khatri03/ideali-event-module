import { useEffect, useRef, useState } from "react"
import { Badge, Box, Button, Flex, Image, Input, SimpleGrid, Stack, Text } from "@chakra-ui/react"
import { ImagePlus, Upload } from "lucide-react"

export function EventBannerStepPage() {
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null)
  const [bannerError, setBannerError] = useState("")

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  function clearPreview() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setBannerFile(null)
    setBannerPreviewUrl(null)
  }

  function handleUploadFiles(files: FileList | null | undefined) {
    const file = files?.[0]
    if (!file) {
      return
    }

    setBannerError("")
    clearPreview()
    const previewUrl = URL.createObjectURL(file)
    objectUrlRef.current = previewUrl
    setBannerFile(file)
    setBannerPreviewUrl(previewUrl)
  }

  return (
    <Stack h="full" gap={5}>
      <Box
        border="1px solid"
        borderColor="gray.200"
        borderRadius="20px"
        bg="linear-gradient(135deg, rgba(66,42,251,0.08) 0%, rgba(117,81,255,0.04) 100%)"
        p={{ base: 4, md: 5 }}
      >
        <Flex align="flex-start" justify="space-between" gap={4} wrap="wrap">
          <Box minW={0}>
            <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
              Banner
            </Text>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} fontWeight="700" color="gray.800">
              Upload a banner for this event. This step is required and will not show a Skip button.
            </Text>
            <Text mt={2} fontSize="sm" color="gray.600">
              Use a wide image so it looks good in cards, headers, and the review screen.
            </Text>
          </Box>

          <Badge variant="subtle" colorPalette="green" borderRadius="999px" px={3} py={1}>
            Required
          </Badge>
        </Flex>
      </Box>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5}>
        <Stack
          gap={4}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="24px"
          bg="white"
          boxShadow="0 10px 28px rgba(15, 23, 42, 0.05)"
          p={{ base: 4, md: 5 }}
        >
          <Box
            border="1px dashed"
            borderColor="gray.200"
            borderRadius="22px"
            bg="gray.50"
            minH="280px"
            px={5}
            py={8}
            display="flex"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
          >
            {bannerPreviewUrl ? (
              <Image
                src={bannerPreviewUrl}
                alt="Event banner preview"
                w="full"
                h="full"
                maxH="360px"
                objectFit="contain"
                borderRadius="18px"
              />
            ) : (
              <Stack gap={3} align="center" maxW="320px">
                <Flex
                  h="60px"
                  w="60px"
                  align="center"
                  justify="center"
                  borderRadius="full"
                  bg="white"
                  border="1px solid"
                  borderColor="gray.200"
                  boxShadow="0 8px 18px rgba(15, 23, 42, 0.05)"
                  color="brand.500"
                >
                  <ImagePlus size={24} />
                </Flex>
                <Text fontSize="sm" fontWeight="800" color="gray.800">
                  No banner selected yet
                </Text>
                <Text fontSize="sm" color="gray.600" lineHeight="1.7">
                  Choose an image now or use the sample banner to preview the layout the team is building toward.
                </Text>
              </Stack>
            )}
          </Box>

          <Flex gap={3} wrap="wrap">
            <Button
              variant="outline"
              borderRadius="14px"
              h="44px"
              px={5}
              colorPalette="gray"
              onClick={() => uploadInputRef.current?.click()}
            >
              <Flex align="center" gap={2}>
                <Upload size={16} />
                <Text as="span">Choose file</Text>
              </Flex>
            </Button>
            <Button
              variant="ghost"
              borderRadius="14px"
              h="44px"
              px={5}
              colorPalette="gray"
              onClick={clearPreview}
              disabled={!bannerPreviewUrl}
            >
              Clear
            </Button>
          </Flex>

          <Input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              handleUploadFiles(event.currentTarget.files)
              event.currentTarget.value = ""
            }}
          />

          {bannerError ? (
            <Text fontSize="sm" color="red.500">
              {bannerError}
            </Text>
          ) : null}

          {bannerFile ? (
            <Text fontSize="sm" color="gray.600">
              Selected file: <Text as="span" fontWeight="700" color="gray.800">{bannerFile.name}</Text>
            </Text>
          ) : null}
        </Stack>

        <Stack
          gap={4}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="24px"
          bg="white"
          boxShadow="0 10px 28px rgba(15, 23, 42, 0.05)"
          p={{ base: 4, md: 5 }}
        >
          <Box>
            <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
              Preview notes
            </Text>
            <Text mt={2} fontSize="sm" color="gray.600" lineHeight="1.7">
              The banner will be shown in the event header and in any shared event cards. It is required so we can
              standardize the event presentation.
            </Text>
          </Box>

          <Box
            border="1px solid"
            borderColor="gray.200"
            borderRadius="22px"
            bg="gray.50"
            px={5}
            py={6}
          >
            <Stack gap={3}>
              <Text fontSize="sm" fontWeight="800" color="gray.800">
                Banner guidance
              </Text>
              <Text fontSize="sm" color="gray.600" lineHeight="1.7">
                Use a wide, high-resolution image. The final implementation will connect this screen to the event
                banner endpoint, but for now it is a visual placeholder that shows the intended UX.
              </Text>
            </Stack>
          </Box>
        </Stack>
      </SimpleGrid>
    </Stack>
  )
}
