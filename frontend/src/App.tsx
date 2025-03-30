
import './App.scss'
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';

const Home = lazy(() => import('./pages/Home/Home'));
const MoviePage = lazy(() => import('./pages/MoviePage/MoviePage'));
const TvShowPage = lazy(() => import('./pages/TvShowPage/TvShowPage'));
const PersonPage = lazy(() => import('./pages/PersonPage/PersonPage'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div className='bg-zinc-900 min-h-screen'></div>}>
      <Navbar/>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movie/:id/:title" element={<MoviePage />} /> 
          <Route path="/tv-show/:id/:title" element={<TvShowPage />} /> 
          <Route path="/person/:id/:name" element={<PersonPage />} /> 
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
