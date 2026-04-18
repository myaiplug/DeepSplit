import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import YoutubeSplitter from './pages/YoutubeSplitter';
import BlogStemSplitting from './pages/BlogStemSplitting';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';

function App() {
  const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/';

  return (
    <Router basename={basePath}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/youtube" element={<YoutubeSplitter />} />
        <Route path="/blog/split-stems-from-youtube" element={<BlogStemSplitting />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/blog/how-to-split-stems-from-youtube" element={<Blog />} />
      </Routes>
    </Router>
  );
}

export default App;
