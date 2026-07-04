import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useAuth, useLogout } from '@superion/auth';
import { AppShell, Card } from '@superion/ui';

export default function ManualsPage() {
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
      title={t('manuals.title')}
      {...(user?.fullName ? { userName: user.fullName } : {})}
      logoutLabel={t('auth.logout')}
      onLogout={handleLogout}
    >
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <Card data-testid="manuals-placeholder" className="max-w-md text-center">
          <p className="text-[hsl(215_20%_65%)]">{t('manuals.placeholder')}</p>
        </Card>
      </div>
    </AppShell>
  );
}
