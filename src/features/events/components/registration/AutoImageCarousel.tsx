import { useEffect, useState } from "react"
import { Box, Button, HStack, Image } from "@chakra-ui/react"
import { hexToRgba } from "@/features/events/utils/registrationFormat"
import type { BannerSlide } from "@/features/events/components/registration/types"

interface AutoImageCarouselProps {
  slides: BannerSlide[]
  accentColor: string
  height?: { base: string; md: string }
}

const SLIDE_INTERVAL_MS = 5000

export function AutoImageCarousel({
  slides,
  accentColor,
  height = { base: "220px", md: "320px" },
}: AutoImageCarouselProps) {
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length)
    }, SLIDE_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [slides.length, isPaused])

  const [prevSlides, setPrevSlides] = useState(slides)
  if (slides !== prevSlides) {
    setPrevSlides(slides)
    setActiveSlide(0)
  }

  if (slides.length === 0) {
    return null
  }

  return (
    <Box
      position="relative"
      h={height}
      overflow="hidden"
      borderRadius="24px"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      bg="gray.100"
    >
      {slides.map((slide, index) => (
        <Box
          key={`${slide.imageUrl}-${index}`}
          position="absolute"
          inset={0}
          opacity={index === activeSlide ? 1 : 0}
          transition="opacity 700ms ease"
          pointerEvents={index === activeSlide ? "auto" : "none"}
        >
          <Image
            src={slide.imageUrl}
            alt=""
            aria-hidden="true"
            w="full"
            h="full"
            maxW="100%"
            objectFit="cover"
            objectPosition="center"
          />
        </Box>
      ))}

      {slides.length > 1 ? (
        <Box position="absolute" left={0} right={0} bottom={4}>
          <HStack gap={2} justify="center">
            {slides.map((slide, index) => (
              <Button
                key={`${slide.imageUrl}-dot-${index}`}
                aria-label={`Show slide ${index + 1}`}
                onClick={() => setActiveSlide(index)}
                w="10px"
                h="10px"
                minW="10px"
                p={0}
                borderRadius="full"
                borderWidth="1px"
                borderColor="whiteAlpha.500"
                cursor="pointer"
                bg={index === activeSlide ? accentColor : "whiteAlpha.400"}
                boxShadow={index === activeSlide ? `0 0 0 3px ${hexToRgba(accentColor, 0.25)}` : "none"}
                transition="all 0.2s ease"
              />
            ))}
          </HStack>
        </Box>
      ) : null}
    </Box>
  )
}
