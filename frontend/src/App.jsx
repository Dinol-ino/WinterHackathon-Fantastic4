// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import PropertyDetails from './pages/PropertyDetails';
import SellProperty from './pages/SellProperty';
import ResaleMarketplace from './pages/ResaleMarketplace';
import CreateProperty from './pages/Admin/CreateProperty';
import AdminConsole from './pages/Admin/AdminConsole';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/property/:id" element={<PropertyDetails />} />
        <Route path="/resale" element={<ResaleMarketplace />} />

        {/* Protected User Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sell" element={<SellProperty />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminConsole />} />
        <Route path="/admin/create" element={<CreateProperty />} />
      </Routes>
    </Router>
  );
}

export default App;