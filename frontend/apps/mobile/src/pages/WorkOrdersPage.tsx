import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useAuth, useLogout } from '@superion/auth';
import { AppShell, Card } from '@superion/ui';

export default function WorkOrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const logout = useLogout();

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  };

  return (
    <AppShell
      title={t('workOrders.title')}
      {...(user?.fullName ? { userName: user.fullName } : {})}
      logoutLabel={t('auth.logout')}
      onLogout={handleLogout}
    >
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <Card data-testid="work-orders-placeholder" className="max-w-md text-center">
          <p className="text-[hsl(215_20%_65%)]">{t('workOrders.placeholder')}</p>
        </Card>
      </div>
    </AppShell>
  );
}
