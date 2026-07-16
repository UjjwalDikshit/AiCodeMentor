import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { FormField } from '../components/ui/form';
import { ROUTES } from '../constants';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validateName, validatePassword } from '../utils/validation';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validateForm() {
    const nextErrors = {};
    const nameError = validateName(form.name);
    if (nameError) nextErrors.name = nameError;

    const emailError = validateEmail(form.email);
    if (emailError) nextErrors.email = emailError;

    const passwordErrors = validatePassword(form.password);
    if (passwordErrors.length) nextErrors.password = passwordErrors[0];

    if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      toast.success('Account created successfully!');
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors?.length) {
        const fieldErrors = {};
        apiErrors.forEach((item) => {
          fieldErrors[item.field] = item.message;
        });
        setErrors(fieldErrors);
      }
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Create account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Password: 8+ chars, upper, lower, number, special
        </p>
      </div>

      <FormField label="Full name" error={errors.name}>
        <Input
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Jane Doe"
          disabled={submitting}
        />
      </FormField>

      <FormField label="Email" error={errors.email}>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={submitting}
        />
      </FormField>

      <FormField label="Password" error={errors.password}>
        <Input
          type="password"
          value={form.password}
          onChange={(e) => updateField('password', e.target.value)}
          autoComplete="new-password"
          disabled={submitting}
        />
      </FormField>

      <FormField label="Confirm password" error={errors.confirmPassword}>
        <Input
          type="password"
          value={form.confirmPassword}
          onChange={(e) => updateField('confirmPassword', e.target.value)}
          autoComplete="new-password"
          disabled={submitting}
        />
      </FormField>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
