import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import YoutubeSplitter from './pages/YoutubeSplitter';
import BlogStemSplitting from './pages/BlogStemSplitting';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/youtube" element={<YoutubeSplitter />} />
        <Route path="/blog/split-stems-from-youtube" element={<BlogStemSplitting />} />
      </Routes>
    </Router>
  );
}

export default App;
