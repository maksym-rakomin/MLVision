import { HashRouter as Router, Routes, Route } from 'react-router-dom'; // Изменено на HashRouter и переименовано в Router для краткости
import './App.css';
import RootLayout from './layouts/RootLayout.jsx';
import { Stream } from './pages/stream/index.jsx';

function App() {
    return (
        // Используем HashRouter вместо BrowserRouter для совместимости с GitHub Pages
        <Router>
            <Routes>
                {/* RootLayout будет оберткой для всех маршрутов внутри него */}
                <Route element={<RootLayout />}>
                    {/* Маршрут для главной страницы. Теперь будет доступен как /#/ */}
                    <Route path="/" element={<Stream />} />
                    {/* Если у вас будут другие маршруты, например /about, они будут доступны как /#/about */}
                    {/* <Route path="/about" element={<About />} /> */}
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
