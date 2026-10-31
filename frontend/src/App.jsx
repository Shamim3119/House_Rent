import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./App.css";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Houses from "./pages/Houses";
import PropertyTypes from "./pages/PropertyTypes";
import PropertyUnits from "./pages/PropertyUnits";
import Tenants from "./pages/Tenants";
import Tenancies from "./pages/Tenancies";
import TenancyCharges from "./pages/TenancyCharges";
import MonthlyBills from "./pages/MonthlyBills";
import Reports from "./pages/Reports";
import Payments from "./pages/Payments";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/houses" element={<Houses />} />
              <Route path="/property-types" element={<PropertyTypes />} />
              <Route path="/property-units" element={<PropertyUnits />} />
              <Route path="/tenants" element={<Tenants />} />
              <Route path="/tenancies" element={<Tenancies />} />
              <Route path="/tenancy-charges" element={<TenancyCharges />} />
              <Route path="/monthly-bills" element={<MonthlyBills />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/payments" element={<Payments />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
