import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import YoutubeSplitter from './pages/YoutubeSplitter';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/youtube" element={<YoutubeSplitter />} />
      </Routes>
    </Router>
  );
}

export default App;
