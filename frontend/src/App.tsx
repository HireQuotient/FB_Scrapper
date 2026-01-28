import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { JobsProvider } from './context/JobsContext';
import { FiltersProvider } from './context/FiltersContext';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <BrowserRouter>
      <FiltersProvider>
        <JobsProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </JobsProvider>
      </FiltersProvider>
    </BrowserRouter>
  );
}

export default App;
