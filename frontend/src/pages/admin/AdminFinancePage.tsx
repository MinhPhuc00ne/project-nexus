import { useState } from 'react';
import { Button } from '../../components/adminDashboard/shared/AdminUI';
import {
  RevenueChart,
  RevenueComposition,
} from '../../components/adminDashboard/Finance/RevenueChart';
import TransactionHistory from '../../components/adminDashboard/Finance/TransactionHistory';
import AdminWallet from '../../components/adminDashboard/Finance/AdminWallet';

export default function AdminFinancePage() {
  const [tab, setTab] = useState<'transactions' | 'overview' | 'wallet'>('transactions');
  return (
    <div className="space-y-5">
      <div role="group" aria-label="Nội dung tài chính" className="flex flex-wrap gap-2">
        <Button
          variant={tab === 'transactions' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'transactions'}
          onClick={() => setTab('transactions')}
        >
          Giao dịch & đối soát
        </Button>
        <Button
          variant={tab === 'overview' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'overview'}
          onClick={() => setTab('overview')}
        >
          Tổng quan doanh thu
        </Button>
        <Button
          variant={tab === 'wallet' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'wallet'}
          onClick={() => setTab('wallet')}
        >
          Ví nền tảng
        </Button>
      </div>
      {tab === 'transactions' ? (
        <TransactionHistory />
      ) : tab === 'overview' ? (
        <div className="grid items-start gap-5 xl:grid-cols-[2fr_1fr]">
          <RevenueChart />
          <RevenueComposition />
        </div>
      ) : (
        <AdminWallet />
      )}
    </div>
  );
}
