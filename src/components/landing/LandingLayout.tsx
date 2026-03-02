import { useState, useEffect, type ReactNode } from 'react'
import LandingNavbar from './LandingNavbar'
import LandingFooter from './LandingFooter'
import '@/styles/landing.css'

interface LandingLayoutProps {
  children: ReactNode
  isDetailPage?: boolean
}

export default function LandingLayout({ children, isDetailPage = false }: LandingLayoutProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <LandingNavbar scrolled={scrolled} isDetailPage={isDetailPage} />
      {children}
      <LandingFooter />
    </div>
  )
}
