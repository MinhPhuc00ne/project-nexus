import ReportsManagement from './ReportsManagement';
import ReportQueue from './ReportQueue';
import { useState } from 'react';
import { Button } from '../shared/AdminUI';

export default function AdminReportsPage() {
  const [tab, setTab] = useState<'disputes' | 'reports'>('disputes');
  return (
    <div className="space-y-5">
      <div className="flex gap-2" role="group" aria-label="Loại yêu cầu">
        <Button
          aria-pressed={tab === 'disputes'}
          variant={tab === 'disputes' ? 'primary' : 'secondary'}
          onClick={() => setTab('disputes')}
        >
          Khiếu nại đơn hàng
        </Button>
        <Button
          aria-pressed={tab === 'reports'}
          variant={tab === 'reports' ? 'primary' : 'secondary'}
          onClick={() => setTab('reports')}
        >
          Báo cáo vi phạm
        </Button>
      </div>
      {tab === 'disputes' ? <ReportsManagement /> : <ReportQueue />}
    </div>
  );
}
