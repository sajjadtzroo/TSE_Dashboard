/**
 * Loan Comparison Calculator
 * Compare multiple loan scenarios side-by-side
 */

import { useState } from 'react';
import { Card, Button } from '../../components/ui';
import { BarChartCard } from '../../components/charts';
import { formatPersianAmount } from '../../utils/persianNumber';
import { calculatePMT, AnnuityType } from '../../utils/timeValueOfMoney';

interface LoanScenario {
  name: string;
  principal: number;
  rate: number;
  term: number;
}

export function LoanComparisonCalculator() {
  const [scenarios, setScenarios] = useState<LoanScenario[]>([
    { name: 'سناریو ۱', principal: 100_000_000, rate: 18, term: 60 },
    { name: 'سناریو ۲', principal: 100_000_000, rate: 20, term: 48 },
    { name: 'سناریو ۳', principal: 100_000_000, rate: 16, term: 72 },
  ]);
  const [showResults, setShowResults] = useState(false);

  // Use CFA-compliant payment calculation
  const calculatePayment = (scenario: LoanScenario) => {
    const monthlyRate = scenario.rate / 100 / 12;
    return calculatePMT(
      -scenario.principal,
      0,
      monthlyRate,
      scenario.term,
      AnnuityType.ORDINARY
    );
  };

  const comparisonData = scenarios.map((s) => {
    const payment = calculatePayment(s);
    return {
      name: s.name,
      قسط: Math.round(payment / 1_000_000),
      'مجموع پرداختی': Math.round((payment * s.term) / 1_000_000),
    };
  });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-100 mb-6">مقایسه سناریوهای وام</h2>

        <div className="space-y-6">
          {scenarios.map((scenario, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-border-dark">
              <input
                type="text"
                value={scenario.name}
                onChange={(e) => {
                  const newScenarios = [...scenarios];
                  newScenarios[index].name = e.target.value;
                  setScenarios(newScenarios);
                }}
                className="px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
                placeholder="نام سناریو"
              />
              <input
                type="number"
                value={scenario.principal}
                onChange={(e) => {
                  const newScenarios = [...scenarios];
                  newScenarios[index].principal = Number(e.target.value);
                  setScenarios(newScenarios);
                }}
                className="px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
                placeholder="مبلغ"
              />
              <input
                type="number"
                value={scenario.rate}
                onChange={(e) => {
                  const newScenarios = [...scenarios];
                  newScenarios[index].rate = Number(e.target.value);
                  setScenarios(newScenarios);
                }}
                className="px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
                placeholder="نرخ (%)"
              />
              <input
                type="number"
                value={scenario.term}
                onChange={(e) => {
                  const newScenarios = [...scenarios];
                  newScenarios[index].term = Number(e.target.value);
                  setScenarios(newScenarios);
                }}
                className="px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
                placeholder="مدت (ماه)"
              />
            </div>
          ))}
        </div>

        <Button onClick={() => setShowResults(true)} variant="primary" className="w-full mt-6">
          مقایسه
        </Button>
      </Card>

      {showResults && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenarios.map((s, idx) => {
              const payment = calculatePayment(s);
              const total = payment * s.term;
              const interest = total - s.principal;

              return (
                <Card key={idx} className="p-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-4">{s.name}</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-400">قسط ماهانه: </span>
                      <span className="text-primary-400 font-semibold">
                        {formatPersianAmount(payment)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">مجموع سود: </span>
                      <span className="text-pink-400 font-semibold">
                        {formatPersianAmount(interest)}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <BarChartCard
            title="مقایسه قسط و مجموع پرداختی (میلیون تومان)"
            data={comparisonData}
            dataKey="قسط"
            height={350}
            color="#8b5cf6"
          />
        </>
      )}
    </div>
  );
}

export default LoanComparisonCalculator;
