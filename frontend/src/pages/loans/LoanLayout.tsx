import { Outlet } from 'react-router-dom';
import { LoanSelectionProvider } from '../../context/LoanSelectionContext';

export default function LoanLayout() {
  return (
    <LoanSelectionProvider>
      <Outlet />
    </LoanSelectionProvider>
  );
}
