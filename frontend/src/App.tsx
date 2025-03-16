
import './App.scss'
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home/Home'));
const MoviePage = lazy(() => import('./pages/MoviePage/MoviePage'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div className='bg-zinc-900 min-h-screen'>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:id/:title" element={<MoviePage />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
