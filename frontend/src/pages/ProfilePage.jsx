import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Camera, Settings } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { FormField } from '../components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ProfileSkeleton } from '../components/ui/skeleton';
import { ROUTES } from '../constants';
import { useProfile, useUpdateProfileMutation, useUploadAvatarMutation } from '../hooks/useProfile';
import { getAvatarUrl } from '../utils/avatar';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { setCurrentUser } = useAuth();
  const { data: profile, isLoading, isError } = useProfile();
  const updateProfile = useUpdateProfileMutation();
  const uploadAvatar = useUploadAvatarMutation();
  const fileInputRef = useRef(null);

  const [name, setName] = useState('');
  const [currentGoal, setCurrentGoal] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setCurrentGoal(profile.currentGoal || '');
      setCurrentUser(profile);
    }
  }, [profile, setCurrentUser]);

  async function handleSave(e) {
    e.preventDefault();
    try {
      const { data } = await updateProfile.mutateAsync({ name: name.trim(), currentGoal: currentGoal.trim() });
      setCurrentUser(data.data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { data } = await uploadAvatar.mutateAsync(file);
      setCurrentUser(data.data.user);
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload avatar');
    }
  }

  if (isLoading) return <ProfileSkeleton />;

  if (isError) {
    return <p className="text-sm text-red-600">Failed to load profile.</p>;
  }

  const avatarUrl = getAvatarUrl(profile?.avatar);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your account and coaching goals</p>
        </div>
        <Link
          to={ROUTES.SETTINGS}
          className="inline-flex h-10 items-center justify-center rounded-md border bg-transparent px-4 text-sm font-medium hover:bg-secondary"
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
          <CardDescription>JPEG, PNG, WebP, or GIF — max 5MB</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt={profile.name} className="h-20 w-20 rounded-full object-cover border" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary border">
                {profile.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-primary-foreground shadow hover:opacity-90"
              disabled={uploadAvatar.isPending}
            >
              <Camera className="h-4 w-4" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <p className="font-medium">{profile.name}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">Role: {profile.role}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <FormField label="Full name">
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={updateProfile.isPending} />
            </FormField>
            <FormField label="Email">
              <Input value={profile.email} disabled className="bg-muted" />
            </FormField>
            <FormField label="Current goal">
              <Input
                value={currentGoal}
                onChange={(e) => setCurrentGoal(e.target.value)}
                placeholder="e.g. Land a senior SWE role at a FAANG company"
                disabled={updateProfile.isPending}
              />
            </FormField>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Streak</p>
            <p className="text-3xl font-bold text-primary">{profile.streak ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Verified</p>
            <p className="text-3xl font-bold">{profile.isVerified ? 'Yes' : 'No'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
