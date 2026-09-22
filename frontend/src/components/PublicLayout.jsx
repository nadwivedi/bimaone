import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import WhatsAppButton from './WhatsAppButton'

const PublicLayout = ({ children }) => {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className='min-h-screen bg-white text-ink font-poppins'>
      <Navbar />
      <main className='pt-16'>{children}</main>
      <Footer />
      <WhatsAppButton />
    </div>
  )
}

export default PublicLayout
