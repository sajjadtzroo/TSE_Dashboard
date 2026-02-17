/**
 * Banks List Component
 */

import { useState } from 'react';
import { useBanks } from '../../hooks';
import { BankCard } from '../../components/cards';
import { LoadingPage, Empty, Button } from '../../components/ui';
import type { BankCategory } from '../../types';

export function BanksList() {
  const { data: banks, isLoading, error } = useBanks();
  const [filter, setFilter] = useState<BankCategory | 'all'>('all');

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <Empty
        title="خطا در بارگذاری"
        description="امکان دریافت اطلاعات بانک‌ها وجود ندارد"
      />
    );
  }

  const filteredBanks = banks?.filter((bank) => {
    if (filter === 'all') return true;
    return bank.category === filter;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          همه ({banks?.length || 0})
        </Button>
        <Button
          variant={filter === 'traditional-banks' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('traditional-banks')}
        >
          سنتی ({banks?.filter((b) => b.category === 'traditional-banks').length || 0})
        </Button>
        <Button
          variant={filter === 'digital-banks' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('digital-banks')}
        >
          دیجیتال ({banks?.filter((b) => b.category === 'digital-banks').length || 0})
        </Button>
      </div>

      {/* Banks Grid */}
      {filteredBanks?.length === 0 ? (
        <Empty title="بانکی یافت نشد" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
          {filteredBanks?.map((bank) => (
            <BankCard key={bank.id} bank={bank} />
          ))}
        </div>
      )}
    </div>
  );
}

export default BanksList;
