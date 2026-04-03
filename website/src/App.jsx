import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import YoutubeSplitter from './pages/YoutubeSplitter';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/youtube" element={<YoutubeSplitter />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/blog/how-to-split-stems-from-youtube" element={<Blog />} />
      </Routes>
    </Router>
  );
}

export default App;
