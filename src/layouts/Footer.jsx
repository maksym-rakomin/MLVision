function Footer() {
  return (
    <footer className="bg-slate-800 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} ML Vision
          </p>
          <div className="flex gap-4">
            <a href="https://vite.dev" target="_blank" rel="noreferrer" className="hover:text-blue-300">Vite</a>
            <a href="https://react.dev" target="_blank" rel="noreferrer" className="hover:text-blue-300">React</a>
            <a href="https://tailwindcss.com" target="_blank" rel="noreferrer" className="hover:text-blue-300">Tailwind CSS</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
