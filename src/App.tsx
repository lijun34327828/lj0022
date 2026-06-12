import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import Tasks from '@/pages/Tasks';
import Settings from '@/pages/Settings';
import useAppStore from './store/index.js';

export default function App() {
  const { setNetworkStatus, setConnected } = useAppStore();

  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus('online');
    };

    const handleOffline = () => {
      setNetworkStatus('offline');
      setConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setNetworkStatus(navigator.onLine ? 'online' : 'offline');

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setNetworkStatus, setConnected]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}
