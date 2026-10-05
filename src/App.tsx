import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import AppLayout from './components/layout/AppLayout';
import Landing from './pages/Landing';
import HowItWorks from './pages/HowItWorks';
import Architecture from './pages/Architecture';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import RumorScanner from './pages/RumorScanner';
import OCRReview from './pages/OCRReview';
import RumorProcessing from './pages/RumorProcessing';
import RumorResult from './pages/RumorResult';
import ImageCheck from './pages/ImageCheck';
import ImageProcessing from './pages/ImageProcessing';
import DeepfakeResult from './pages/DeepfakeResult';
import ScamAlert from './pages/ScamAlert';
import ScamProcessing from './pages/ScamProcessing';
import ScamResult from './pages/ScamResult';
import ScamAwareness from './pages/ScamAwareness';
import History from './pages/History';
import ScanDetails from './pages/ScanDetails';
import SavedEvidence from './pages/SavedEvidence';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import TechSpecHelp from './pages/TechSpecHelp';

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing, Walkthrough & Authentication Pages */}
            <Route path="/" element={<Landing />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/architecture" element={<Architecture />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Application Layout Sub-routes */}
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="rumor" element={<RumorScanner />} />
              <Route path="ocr-review" element={<OCRReview />} />
              <Route path="rumor/processing" element={<RumorProcessing />} />
              <Route path="result/rumor/:id" element={<RumorResult />} />
              <Route path="result/rumor" element={<RumorResult />} />
              <Route path="scam" element={<ScamAlert />} />
              <Route path="scam/processing" element={<ScamProcessing />} />
              <Route path="result/scam/:id" element={<ScamResult />} />
              <Route path="result/scam" element={<ScamResult />} />
              <Route path="scam-awareness" element={<ScamAwareness />} />
              <Route path="safety-guide" element={<ScamAwareness />} />
              <Route path="image" element={<ImageCheck />} />
              <Route path="image/processing" element={<ImageProcessing />} />
              <Route path="result/deepfake/:id" element={<DeepfakeResult />} />
              <Route path="result/deepfake" element={<DeepfakeResult />} />
              <Route path="history" element={<History />} />
              <Route path="history/:id" element={<ScanDetails />} />
              <Route path="saved" element={<SavedEvidence />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="help" element={<TechSpecHelp />} />
              <Route path="architecture" element={<Architecture />} />
            </Route>

            {/* Catch-all redirect to Landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </LanguageProvider>
  );
}
