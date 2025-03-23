
import './App.scss'
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';

const Home = lazy(() => import('./pages/Home/Home'));
const MoviePage = lazy(() => import('./pages/MoviePage/MoviePage'));
const TvShowPage = lazy(() => import('./pages/TvShowPage/TvShowPage'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div className='bg-zinc-900 min-h-screen'></div>}>
      <Navbar/>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movie/:id/:title" element={<MoviePage />} /> 
          <Route path="/tv-show/:id/:title" element={<TvShowPage />} /> 
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
