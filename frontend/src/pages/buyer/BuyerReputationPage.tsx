import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  ShieldCheck,
  AlertTriangle,
  History,
  CheckCircle2,
  Gavel,
  Store,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  getReputationSummaryApi,
  getReputationLogsApi,
  type ReputationSummary,
  type ReputationLogItem,
  type ReputationTrustLevel,
} from '../../services/reputation.service';
import { ROUTES } from '../../routes/paths';

const TRUST_LEVEL_CONFIG: Record<
  ReputationTrustLevel,
  { label: string; badgeCls: string; colorCls: string; icon: string; desc: string }
> = {
  EXCELLENT: {
    label: 'Kim Cương (Tối Thượng)',
    badgeCls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    colorCls: 'text-indigo-600',
    icon: '💎',
    desc: 'Cấp bậc tin cậy cao nhất trên sàn NEXUS. Hưởng trọn vẹn đặc quyền VIP và ưu tiên xử lý tranh chấp.',
  },
  VERY_GOOD: {
    label: 'Bạch Kim (Xuất Sắc)',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    colorCls: 'text-emerald-600',
    icon: '🛡️',
    desc: 'Tài khoản hoạt động rất uy tín, không có vi phạm, lịch sử thanh toán chuẩn xác.',
  },
  GOOD: {
    label: 'Hoàng Gia (Rất Tốt)',
    badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',
    colorCls: 'text-blue-600',
    icon: '👑',
    desc: 'Hoàn thành các đơn hàng ổn định, đủ điều kiện mở gian hàng và tham gia đấu giá.',
  },
  STANDARD: {
    label: 'Tiêu Chuẩn (Bình Thường)',
    badgeCls: 'bg-slate-100 text-slate-700 border-slate-200',
    colorCls: 'text-slate-600',
    icon: '🥈',
    desc: 'Tài khoản ở mức an toàn cơ bản. Cần tiếp tục duy trì giao dịch tốt để nâng bậc.',
  },
  POOR: {
    label: 'Cảnh Báo (Nguy Cơ Khóa)',
    badgeCls: 'bg-rose-50 text-rose-700 border-rose-200',
    colorCls: 'text-rose-600',
    icon: '⚠️',
    desc: 'Điểm uy tín dưới ngưỡng an toàn do có vi phạm đơn hàng. Một số quyền có thể bị hạn chế.',
  },
};

export default function BuyerReputationPage() {
  const [summary, setSummary] = useState<ReputationSummary | null>(null);
  const [logs, setLogs] = useState<ReputationLogItem[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);

  const fetchReputationData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, logsRes] = await Promise.allSettled([
        getReputationSummaryApi(),
        getReputationLogsApi(page, limit),
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value) {
        setSummary(sumRes.value);
      }
      if (logsRes.status === 'fulfilled' && logsRes.value) {
        setLogs(logsRes.value.items || []);
        setTotalLogs(logsRes.value.total || 0);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    void fetchReputationData();
  }, [fetchReputationData]);

  const score = summary?.score ?? 100;
  const trustLevelKey = (summary?.trustLevel || 'EXCELLENT') as ReputationTrustLevel;
  const config = TRUST_LEVEL_CONFIG[trustLevelKey] || TRUST_LEVEL_CONFIG.EXCELLENT;
  const totalPages = Math.ceil(totalLogs / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <Award size={20} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900">
                Điểm Uy Tín & Cấp Bậc Khách Hàng
              </h1>
              <p className="text-xs text-slate-500">
                Thang điểm đánh giá độ tin cậy, lịch sử giao dịch và quyền lợi của tài khoản trên
                sàn NEXUS.
              </p>
            </div>
          </div>
        </div>

        <Link
          to={ROUTES.BUYER}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
        >
          <ChevronLeft size={14} /> Quay lại Tổng quan
        </Link>
      </div>

      {loading && !summary ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-xs">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
          <span>Đang tải thông tin điểm uy tín...</span>
        </div>
      ) : (
        <>
          {/* Top Grid: Score Gauge & Privileges */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left: Overall Score (7 cols) */}
            <div className="md:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Chỉ Số Uy Tín Hiện Tại
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${config.badgeCls}`}
                  >
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                  </span>
                </div>

                <div className="mt-5 flex items-baseline gap-3">
                  <span className="text-5xl font-black tracking-tight text-slate-900">{score}</span>
                  <span className="text-sm font-bold text-slate-400">/ 100 điểm tối đa</span>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        score >= 80
                          ? 'bg-gradient-to-r from-emerald-500 to-indigo-600'
                          : score >= 50
                            ? 'bg-blue-500'
                            : score >= 20
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-slate-400 font-medium">
                    <span>0 (Rủi ro cao)</span>
                    <span>20 (Đủ điều kiện bán)</span>
                    <span>80 (Đấu giá VIP)</span>
                    <span>100 (Tối thượng)</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
                <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{config.desc}</p>
              </div>
            </div>

            {/* Right: Privileges & Safety (5 cols) */}
            <div className="md:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                  Quyền Lợi & Điều Kiện Mở Khóa
                </h3>

                <div className="space-y-3">
                  {/* Privilege 1: VIP Auction */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <Gavel size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">Tham gia Đấu giá VIP</p>
                        <p className="text-[11px] text-slate-400">Yêu cầu uy tín ≥ 80</p>
                      </div>
                    </div>
                    {score >= 80 ? (
                      <span className="flex items-center gap-1 font-bold text-emerald-600 text-xs">
                        <CheckCircle2 size={14} /> Đủ điều kiện
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-bold text-slate-400 text-xs">
                        Chưa đạt
                      </span>
                    )}
                  </div>

                  {/* Privilege 2: Become Seller */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                        <Store size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">Mở gian hàng Seller</p>
                        <p className="text-[11px] text-slate-400">Yêu cầu uy tín ≥ 20</p>
                      </div>
                    </div>
                    {score >= 20 && !summary?.isSuspended ? (
                      <span className="flex items-center gap-1 font-bold text-emerald-600 text-xs">
                        <CheckCircle2 size={14} /> Đủ điều kiện
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-bold text-rose-500 text-xs">
                        <AlertTriangle size={14} /> Bị giới hạn
                      </span>
                    )}
                  </div>

                  {/* Privilege 3: Verified Status */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <ShieldCheck size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">Trạng thái an toàn</p>
                        <p className="text-[11px] text-slate-400">Bảo vệ qua NEXUS Escrow</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 font-bold text-emerald-600 text-xs">
                      <CheckCircle2 size={14} /> Hoạt động tốt
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <Link
                  to="/buyer/orders"
                  className="w-full flex items-center justify-center gap-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  <span>Xem đơn hàng để tích lũy thêm điểm</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Card: Reputation Audit History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <History size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Lịch Sử Biến Động Điểm Uy Tín</h3>
                <span className="text-xs text-slate-400 font-normal">
                  ({totalLogs} giao dịch được ghi nhận)
                </span>
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <Award size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">Tài khoản chưa có biến động điểm nào</p>
                <p className="text-slate-400 mt-1 max-w-sm mx-auto">
                  Bạn đang giữ mức điểm chuẩn ban đầu (100 điểm). Hãy tiếp tục hoàn thành các đơn
                  hàng để duy trì thứ hạng cao!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="pb-3 pl-2">Thời gian</th>
                      <th className="pb-3">Hành động / Lý do</th>
                      <th className="pb-3 text-center">Biến động</th>
                      <th className="pb-3 text-right pr-2">Số dư sau giao dịch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {logs.map((log) => {
                      const isPositive = log.deltaPoints > 0;
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 pl-2 text-slate-500 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-3.5 font-medium text-slate-900">
                            <p>{log.reason}</p>
                            {log.referenceId && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Ref: #{log.referenceId}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 text-center font-extrabold whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                                isPositive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {isPositive ? `+${log.deltaPoints}` : log.deltaPoints} điểm
                            </span>
                          </td>
                          <td className="py-3.5 text-right pr-2 font-bold text-slate-900">
                            {log.balanceAfter} đ
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-500">
                  Trang {page} / {totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
