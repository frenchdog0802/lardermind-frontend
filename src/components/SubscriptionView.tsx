import { useTranslation } from 'react-i18next';
import { AppHeader } from './AppHeader';
import { SubscriptionPanel } from './SubscriptionPanel';

interface SubscriptionViewProps {
  onOpenMenu?: () => void;
  active?: boolean;
  checkoutSuccess?: boolean;
  checkoutCancelled?: boolean;
  portalReturn?: boolean;
}

export function SubscriptionView({
  onOpenMenu,
  active = true,
  checkoutSuccess = false,
  checkoutCancelled = false,
  portalReturn = false,
}: SubscriptionViewProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col w-full min-h-screen bg-linen">
      <AppHeader title={t('nav.subscription')} onOpenMenu={onOpenMenu} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 lg:px-8 py-6">
        <SubscriptionPanel
          active={active}
          checkoutSuccess={checkoutSuccess}
          checkoutCancelled={checkoutCancelled}
          portalReturn={portalReturn}
        />
      </main>
    </div>
  );
}
