import { useEffect, useRef, useCallback } from 'react'

export function useScrollReveal() {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const elementsRef = useRef<Set<Element>>(new Set())

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const delay = el.dataset.revealDelay
            if (delay) {
              setTimeout(() => {
                el.classList.add('scroll-revealed')
              }, parseInt(delay, 10) * 50)
            } else {
              el.classList.add('scroll-revealed')
            }
            observerRef.current?.unobserve(el)
          }
        })
      },
      { threshold: 0.15 }
    )

    // Observe any elements already registered
    elementsRef.current.forEach((el) => {
      observerRef.current?.observe(el)
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  const reveal = useCallback((el: HTMLElement | null) => {
    if (!el) return
    el.classList.add('scroll-reveal')
    elementsRef.current.add(el)
    observerRef.current?.observe(el)
  }, [])

  return { reveal }
}
