import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import Configuration from './pages/Configuration';
import CallLogs from './pages/CallLogs';
import Contacts from './pages/Contacts';
import Appointments from './pages/Appointments';
import KnowledgeBase from './pages/KnowledgeBase';
import OutboundCalls from './pages/OutboundCalls';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/config" element={<Configuration />} />
        <Route path="/logs" element={<CallLogs />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/kb" element={<KnowledgeBase />} />
        <Route path="/calls" element={<OutboundCalls />} />
        <Route path="*" element={
          <div className="page-content">
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>404 — Page not found</h1>
            <a href="/" style={{ color: 'var(--accent-400)', marginTop: 8, display: 'inline-block' }}>← Back to Overview</a>
          </div>
        } />
      </Routes>
    </Layout>
  );
}
