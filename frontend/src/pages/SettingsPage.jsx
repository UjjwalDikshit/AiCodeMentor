import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { FormField } from '../components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ROUTES } from '../constants';
import { useUpdatePasswordMutation } from '../hooks/useProfile';
import { validatePassword } from '../utils/validation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function SettingsPage() {
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const updatePassword = useUpdatePasswordMutation();
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!form.currentPassword) nextErrors.currentPassword = 'Current password is required';

    const passwordErrors = validatePassword(form.newPassword);
    if (passwordErrors.length) nextErrors.newPassword = passwordErrors[0];

    if (form.newPassword !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await updatePassword.mutateAsync({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      toast.success('Password updated — please sign in again');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      await logout();
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors?.length) {
        const fieldErrors = {};
        apiErrors.forEach((item) => {
          fieldErrors[item.field] = item.message;
        });
        setErrors(fieldErrors);
      }
      toast.error(err.response?.data?.message || 'Failed to update password');
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          to={ROUTES.PROFILE}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Security and account preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Light, dark, or follow system preference</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {['light', 'dark', 'system'].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={`rounded-md border px-4 py-2 text-sm capitalize ${
                theme === value ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
              }`}
              aria-pressed={theme === value}
            >
              {value}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Updating your password will sign you out of all sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <FormField label="Current password" error={errors.currentPassword}>
              <Input
                type="password"
                value={form.currentPassword}
                onChange={(e) => updateField('currentPassword', e.target.value)}
                autoComplete="current-password"
                disabled={updatePassword.isPending}
              />
            </FormField>
            <FormField label="New password" error={errors.newPassword}>
              <Input
                type="password"
                value={form.newPassword}
                onChange={(e) => updateField('newPassword', e.target.value)}
                autoComplete="new-password"
                disabled={updatePassword.isPending}
              />
            </FormField>
            <FormField label="Confirm new password" error={errors.confirmPassword}>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                autoComplete="new-password"
                disabled={updatePassword.isPending}
              />
            </FormField>
            <Button type="submit" disabled={updatePassword.isPending}>
              {updatePassword.isPending ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
