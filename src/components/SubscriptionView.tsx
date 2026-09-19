import { useTranslation } from 'react-i18next';
import { AppHeader } from './AppHeader';
import { SubscriptionPanel } from './SubscriptionPanel';

interface SubscriptionViewProps {
  onOpenMenu: () => void;
  checkoutSuccess?: boolean;
  checkoutCancelled?: boolean;
}

export function SubscriptionView({
  onOpenMenu,
  checkoutSuccess = false,
  checkoutCancelled = false,
}: SubscriptionViewProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col w-full min-h-screen bg-linen">
      <AppHeader title={t('nav.subscription')} onOpenMenu={onOpenMenu} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 lg:px-8 py-6">
        <SubscriptionPanel
          checkoutSuccess={checkoutSuccess}
          checkoutCancelled={checkoutCancelled}
        />
      </main>
    </div>
  );
}
