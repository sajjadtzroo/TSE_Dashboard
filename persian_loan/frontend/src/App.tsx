import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import { LoanSelectionProvider } from './context/LoanSelectionContext';
import { MainLayout } from './components/layout';

// Lazy load page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Banks = lazy(() => import('./pages/Banks'));
const BankDetail = lazy(() => import('./pages/BankDetail'));
const Loans = lazy(() => import('./pages/Loans'));
const LoanDetail = lazy(() => import('./pages/LoanDetail'));
const Calculator = lazy(() => import('./pages/Calculator'));
const Import = lazy(() => import('./pages/Import'));
const MyLoans = lazy(() => import('./pages/MyLoans'));
const Compare = lazy(() => import('./pages/Compare'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Calculators = lazy(() => import('./pages/Calculators'));
const LoanOptimizer = lazy(() => import('./features/loan-optimizer/LoanOptimizerPage'));

function LoadingFallback() {
  return (
    <Center h="100vh">
      <Loader color="rally-green" size="lg" />
    </Center>
  );
}

function App() {
  return (
    <LoanSelectionProvider>
      <Suspense fallback={<LoadingFallback />}>
        <BrowserRouter
          basename="/loans"
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="banks" element={<Banks />} />
              <Route path="banks/:bankId" element={<BankDetail />} />
              <Route path="loans" element={<Loans />} />
              <Route path="loans/:bankId/:loanId" element={<LoanDetail />} />
              <Route path="compare" element={<Compare />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="calculator" element={<Calculator />} />
              <Route path="calculators" element={<Calculators />} />
              <Route path="calculators/:type" element={<Calculators />} />
              <Route path="loan-optimizer" element={<LoanOptimizer />} />
              <Route path="import" element={<Import />} />
              <Route path="my-loans" element={<MyLoans />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </Suspense>
    </LoanSelectionProvider>
  );
}

export default App;
