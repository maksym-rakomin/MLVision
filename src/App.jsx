import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'
import RootLayout from './layouts/RootLayout.jsx'
import {Stream} from './pages/stream/index.jsx'

function App() {

  return (
      <BrowserRouter>
          <Routes>
              <Route element={<RootLayout />}>
                  <Route path="/" element={<Stream />} />
              </Route>
          </Routes>
      </BrowserRouter>
  )
}

export default App
