"use client"

import { useEffect, useState, useRef } from "react"
import { Sparkles, FileText, Mic, CheckCircle, Search, ChevronLeft, ChevronRight } from "lucide-react"

interface SectionProps {
  isActive: boolean
}

const steps = [
  {
    icon: Search,
    title: "You Find Content",
    description:
      "Simply provide a YouTube link you don't have time to watch or select a news topic you want to catch up on.",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50",
  },
  {
    icon: Sparkles,
    title: "AI Analysis",
    description:
      "Our advanced AI (powered by Google's Gemini) instantly analyzes the content, identifies the key points, and understands the main arguments.",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-50",
  },
  {
    icon: FileText,
    title: "Smart Summaries & Scripts",
    description:
      "It then writes a detailed, structured text summary and generates a script for a conversational, mini-podcast.",
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-50",
  },
  {
    icon: Mic,
    title: "Natural Audio",
    description:
      "We use a high-quality, natural-sounding AI voice to turn that script into a polished podcast episode.",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50",
  },
  {
    icon: CheckCircle,
    title: "Ready For You",
    description:
      "Your new summary lands in your personal feed, complete with its own structured text page and the polished audio episode.",
    color: "from-pink-500 to-rose-500",
    bgColor: "bg-pink-50",
  },
]

export function HowItWorksSection({ isActive }: SectionProps) {
  const [mounted, setMounted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isActive) {
      setMounted(false)
      const timer = setTimeout(() => setMounted(true), 100)
      return () => clearTimeout(timer)
    }
  }, [isActive])

  const scrollToIndex = (index: number) => {
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.scrollWidth / steps.length
      carouselRef.current.scrollTo({
        left: cardWidth * index,
        behavior: "smooth",
      })
      setCurrentIndex(index)
    }
  }

  const handleScroll = () => {
    if (carouselRef.current) {
      const scrollLeft = carouselRef.current.scrollLeft
      const cardWidth = carouselRef.current.scrollWidth / steps.length
      const newIndex = Math.round(scrollLeft / cardWidth)
      setCurrentIndex(newIndex)
    }
  }

  const canScrollLeft = currentIndex > 0
  const canScrollRight = currentIndex < steps.length - 1

  return (
    <div className="relative h-full w-full bg-gradient-to-b from-rose-50 to-white overflow-hidden">
      <div className="relative z-10 h-full flex flex-col justify-center">
        {/* Header */}
        <div className="px-6 md:px-12 lg:px-24 max-w-7xl mx-auto w-full mb-8">
          <div
            className={`transition-all duration-1000 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-pink-500" />
              <span className="text-pink-500 font-medium">The AI Magic</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-gray-900 text-balance">How It Works</h2>
          </div>
        </div>

        <div className="relative w-full">
          {/* Navigation arrows */}
          <button
            onClick={() => scrollToIndex(currentIndex - 1)}
            disabled={!canScrollLeft}
            className={`absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center transition-all duration-300 ${
              canScrollLeft ? "opacity-100 hover:scale-110" : "opacity-0 pointer-events-none"
            }`}
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>

          <button
            onClick={() => scrollToIndex(currentIndex + 1)}
            disabled={!canScrollRight}
            className={`absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center transition-all duration-300 ${
              canScrollRight ? "opacity-100 hover:scale-110" : "opacity-0 pointer-events-none"
            }`}
          >
            <ChevronRight className="w-6 h-6 text-gray-700" />
          </button>

          {/* Carousel container */}
          <div
            ref={carouselRef}
            onScroll={handleScroll}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth px-6 md:px-12 lg:px-24 pb-8 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {steps.map((step, index) => (
              <div
                key={step.title}
                className={`flex-shrink-0 w-[320px] md:w-[400px] snap-center transition-all duration-700 ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${200 + index * 100}ms` }}
              >
                {/* Card with visual area at top */}
                <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100 h-full">
                  {/* Visual area - mockup style */}
                  <div
                    className={`${step.bgColor} h-48 md:h-56 flex items-center justify-center relative overflow-hidden`}
                  >
                    {/* Decorative circles */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full" />
                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/20 rounded-full" />

                    {/* Icon display */}
                    <div
                      className={`relative w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl`}
                    >
                      <step.icon className="w-12 h-12 md:w-14 md:h-14 text-white" />
                    </div>

                    {/* Step number badge */}
                    <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {index + 1}
                    </div>
                  </div>

                  {/* Text content */}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                    <p className="text-gray-600 leading-relaxed text-sm md:text-base">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination dots */}
          <div className="flex justify-center gap-2 mt-4">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? "w-6 bg-pink-500" : "bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
