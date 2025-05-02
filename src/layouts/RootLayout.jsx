import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col w-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 mt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default RootLayout
