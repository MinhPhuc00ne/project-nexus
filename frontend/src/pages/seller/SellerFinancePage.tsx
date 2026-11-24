import { useCallback, useEffect, useState, type ReactElement } from 'react';
import {
  Landmark as BankOutlined,
  Loader2,
  Plus as PlusOutlined,
  RefreshCw as ReloadOutlined,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getStoredToken } from '../../services/auth';
import { createNotificationConnection } from '../../services/notificationSocket';
import { getSellerRevenue } from '../../services/sellerFinance';
import {
  checkBuyerDepositStatusApi,
  depositBuyerWalletApi,
  type WalletDepositProvider,
} from '../../services/wallet.service';
import useProductResource from '../../components/productDetail/useProductResource';
import { useToast } from '../../components/ToastNotification';
import WalletTopUpModal from '../../components/wallet/WalletTopUpModal';
import { useSellerSession } from '../../components/seller/SellerSession';
import { PageHeading, Panel, SellerButton } from '../../components/seller/SellerUI';
import SellerResourceState from '../../components/seller/SellerResourceState';
import SellerFinanceSummary from '../../components/seller/SellerFinanceSummary';
import SellerFinanceHistory from '../../components/seller/SellerFinanceHistory';
import SellerLinkedBankCard from '../../components/seller/SellerLinkedBankCard';
import SellerWithdrawalModal from '../../components/seller/SellerWithdrawalModal';

export default function SellerFinancePage(): ReactElement {
  const user = useSellerSession();
  const { token } = useAuth();
  return <FinanceWorkspace key={`${user.id}:${token}`} />;
}

function FinanceWorkspace(): ReactElement {
  const { t } = useTranslation('seller');
  const user = useSellerSession();
  const { refreshProfile } = useAuth();
  const toast = useToast();
  const [revision, setRevision] = useState(0);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<WalletDepositProvider>('PAYOS');
  const [submittingTopUp, setSubmittingTopUp] = useState(false);
  const [pendingDepositOrderCode, setPendingDepositOrderCode] = useState<number | null>(null);

  const load = useCallback(() => {
    void revision;
    return getSellerRevenue();
  }, [revision]);
  const revenue = useProductResource(load);

  const refresh = useCallback((): void => {
    setRevision((value) => value + 1);
  }, []);

  const saved = useCallback((): void => {
    refresh();
    void refreshProfile();
  }, [refresh, refreshProfile]);

  useEffect(() => {
    const token = getStoredToken();
    const userId = user?.id;
    if (!token || !userId) return undefined;

    try {
      const connection = createNotificationConnection();
      connection.socket.on('notification:new', (notification) => {
        if (notification.userId !== userId) return;
        const isWalletEvent =
          notification.targetUrl === '/seller/finance' || notification.type === 'PAYMENT';
        if (isWalletEvent) {
          saved();
        }
      });
      connection.connect();
      return () => connection.disconnect();
    } catch {
      return undefined;
    }
  }, [saved, user?.id]);

  useEffect(() => {
    if (pendingDepositOrderCode === null) return undefined;
    let active = true;
    let attempts = 0;
    let timeoutId: number;

    const pollDepositStatus = async () => {
      try {
        const status = await checkBuyerDepositStatusApi(pendingDepositOrderCode);
        if (!active) return;
        if (status.status !== 'PENDING') {
          setPendingDepositOrderCode(null);
          if (status.status === 'SUCCESS') {
            toast.success(t('finance.topUp.completed'));
          } else {
            toast.error(t('finance.topUp.failed'));
          }
          saved();
          return;
        }
      } catch {
        // Keep polling until max attempts
      }

      attempts += 1;
      if (attempts >= 24) {
        setPendingDepositOrderCode(null);
        toast.error(t('finance.topUp.pendingTimeout'));
        return;
      }
      timeoutId = window.setTimeout(() => void pollDepositStatus(), 5000);
    };

    timeoutId = window.setTimeout(() => void pollDepositStatus(), 5000);
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [pendingDepositOrderCode, saved, t, toast]);

  async function handleDeposit(): Promise<void> {
    const amount = Number(topUpAmount);
    if (!Number.isFinite(amount) || amount < 10000) {
      toast.error(t('finance.topUp.minAmountErr'));
      return;
    }
    const paymentWindow = selectedMethod === 'PAYOS' ? window.open('about:blank', '_blank') : null;
    if (selectedMethod === 'PAYOS' && !paymentWindow) {
      toast.error(t('finance.topUp.windowBlockedErr'));
      return;
    }
    if (paymentWindow) paymentWindow.opener = null;
    setSubmittingTopUp(true);
    try {
      const res = await depositBuyerWalletApi({ amount, provider: selectedMethod });
      if (res.checkoutUrl) {
        paymentWindow?.location.assign(res.checkoutUrl);
        if (res.orderCode) setPendingDepositOrderCode(res.orderCode);
      } else {
        paymentWindow?.close();
      }
      toast.success(t('finance.topUp.requestSent'));
      setTopUpOpen(false);
      setTopUpAmount('');
      saved();
    } catch (error) {
      paymentWindow?.close();
      toast.error(error instanceof Error ? error.message : t('finance.topUp.connectErr'));
    } finally {
      setSubmittingTopUp(false);
    }
  }

  const balance = revenue.data?.wallet.availableToWithdraw ?? 0;
  return (
    <div className="space-y-5">
      <PageHeading
        title={t('finance.pageTitle')}
        description={t('finance.pageDesc')}
        actions={
          <>
            <SellerButton secondary onClick={refresh} disabled={revenue.loading}>
              <ReloadOutlined /> {t('finance.refresh')}
            </SellerButton>
            <SellerButton
              secondary
              onClick={() => setTopUpOpen(true)}
              disabled={revenue.loading || !!user.isShopSuspended}
            >
              <PlusOutlined /> {t('finance.topUpBtn')}
            </SellerButton>
            <SellerButton
              onClick={() => setWithdrawOpen(true)}
              disabled={
                revenue.loading ||
                !!revenue.error ||
                !revenue.data ||
                !!user.isShopSuspended ||
                balance < 50000
              }
            >
              <BankOutlined /> {t('finance.requestWithdraw')}
            </SellerButton>
          </>
        }
      />
      {pendingDepositOrderCode !== null && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800"
        >
          <span className="flex items-center gap-2 font-medium">
            <Loader2 className="size-4 animate-spin text-blue-600" aria-hidden="true" />
            {t('finance.topUp.checkingStatus', { orderCode: pendingDepositOrderCode })}
          </span>
          <SellerButton secondary onClick={saved}>
            <ReloadOutlined className="size-3.5" aria-hidden="true" />
            {t('finance.refresh')}
          </SellerButton>
        </div>
      )}
      {user.isShopSuspended && (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          {t('finance.suspendedAlert')}
          {user.suspensionReason
            ? ` ${t('finance.suspendedReason', { reason: user.suspensionReason })}`
            : ''}
        </p>
      )}
      <SellerResourceState loading={revenue.loading} error={revenue.error} retry={revenue.retry}>
        {revenue.data && <SellerFinanceSummary data={revenue.data} />}
      </SellerResourceState>
      {!revenue.loading && revenue.data && balance < 50000 && !user.isShopSuspended && (
        <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-800">
          {t('finance.minWithdrawNotice')}
        </p>
      )}
      <SellerLinkedBankCard onSaved={saved} />
      <SellerFinanceHistory revision={revision} />
      <Panel title={t('finance.processTitle')} subtitle={t('finance.processSubtitle')}>
        <ol className="grid gap-4 text-xs sm:grid-cols-3">
          {[
            t('finance.processSteps.step1'),
            t('finance.processSteps.step2'),
            t('finance.processSteps.step3'),
          ].map((text, index) => (
            <li
              key={text}
              className="flex gap-3 rounded-xl bg-blue-50/60 p-4 leading-6 text-slate-600"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                {index + 1}
              </span>
              {text}
            </li>
          ))}
        </ol>
      </Panel>
      {withdrawOpen && (
        <SellerWithdrawalModal
          balance={balance}
          suspended={!!user.isShopSuspended}
          onClose={() => setWithdrawOpen(false)}
          onSaved={saved}
        />
      )}
      <WalletTopUpModal
        isOpen={topUpOpen}
        onClose={() => {
          if (!submittingTopUp) setTopUpOpen(false);
        }}
        topUpAmount={topUpAmount}
        setTopUpAmount={setTopUpAmount}
        selectedMethod={selectedMethod}
        setSelectedMethod={setSelectedMethod}
        onConfirm={() => void handleDeposit()}
        submitting={submittingTopUp}
      />
    </div>
  );
}
