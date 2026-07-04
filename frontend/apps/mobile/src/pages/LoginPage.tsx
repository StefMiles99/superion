import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useLogin, useLoginRedirectPath } from '@superion/auth';
import { getDefaultRouteForRole, AuthError } from '@superion/domain';
import { Button, Card, Form, Input, Label } from '@superion/ui';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useLogin();
  const redirectPath = useLoginRedirectPath();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (redirectPath) {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      const session = await login.mutateAsync({ email, password });
      navigate(getDefaultRouteForRole(session.user.role), { replace: true });
    } catch (error) {
      if (error instanceof AuthError) {
        setErrorMessage(t('auth.errorInvalidCredentials'));
        return;
      }
      setErrorMessage(t('auth.errorGeneric'));
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="mb-6 text-center text-2xl font-bold">{t('auth.title')}</h1>
        <Form onSubmit={handleSubmit} aria-describedby={errorMessage ? errorId : undefined}>
          <div>
            <Label htmlFor={emailId}>{t('auth.email')}</Label>
            <Input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              hasError={Boolean(errorMessage)}
            />
          </div>
          <div>
            <Label htmlFor={passwordId}>{t('auth.password')}</Label>
            <Input
              id={passwordId}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              hasError={Boolean(errorMessage)}
            />
          </div>
          {errorMessage ? (
            <p id={errorId} role="alert" className="text-sm text-[hsl(0_72%_51%)]">
              {errorMessage}
            </p>
          ) : null}
          <Button type="submit" disabled={login.isPending} className="w-full">
            {login.isPending ? t('common.loading') : t('auth.submit')}
          </Button>
        </Form>
      </Card>
    </main>
  );
}
