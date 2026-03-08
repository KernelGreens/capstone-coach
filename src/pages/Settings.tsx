import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Camera, Shield, Bell, BellRing, BellOff, Fingerprint, Smartphone, Trash2, RotateCcw, Globe } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useBiometricAuth } from '@/hooks/use-biometric-auth';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useNavigate } from 'react-router-dom';

function OnboardingResetCard() {
  const { user, userRole } = useAuth();
  const { resetOnboarding } = useOnboarding(user?.id, userRole);
  const navigate = useNavigate();
  const { toast } = useToast();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding Tour</CardTitle>
        <CardDescription>Replay the welcome wizard and guided tour to revisit key features</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          onClick={() => {
            resetOnboarding();
            toast({ title: 'Onboarding reset', description: 'Redirecting to dashboard…' });
            navigate('/dashboard');
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Replay Onboarding Tour
        </Button>
      </CardContent>
    </Card>
  );
}
function NotificationsTab() {
  const { isSupported, isSubscribed, permission, loading, subscribe, unsubscribe } = usePushNotifications();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Configure how you receive notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              {isSubscribed ? (
                <BellRing className="h-4 w-4 text-primary" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
              <Label>Push Notifications</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              {!isSupported
                ? 'Push notifications are not supported in your browser'
                : permission === 'denied'
                ? 'Notifications are blocked. Please enable them in your browser settings.'
                : isSubscribed
                ? 'You are receiving push notifications for meetings, deadlines, and updates'
                : 'Enable push notifications to stay updated on meetings and deadlines'}
            </p>
          </div>
          {isSupported && permission !== 'denied' && (
            <Button
              variant={isSubscribed ? 'outline' : 'default'}
              size="sm"
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isSubscribed ? 'Disable' : 'Enable'}
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Email Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive email notifications for important updates
            </p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Progress Reminders</Label>
            <p className="text-sm text-muted-foreground">
              Get reminded about weekly progress submissions
            </p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Meeting Reminders</Label>
            <p className="text-sm text-muted-foreground">
              Receive reminders before scheduled meetings
            </p>
          </div>
          <Switch defaultChecked />
        </div>
      </CardContent>
    </Card>
  );
}

function BiometricSettingsCard() {
  const { isSupported, loading, registerBiometric, getRegisteredCredentials, removeCredential } = useBiometricAuth();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [deviceName, setDeviceName] = useState('');
  const [showAddDevice, setShowAddDevice] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    const creds = await getRegisteredCredentials();
    setCredentials(creds);
  };

  const biometricEnabled = credentials.length > 0;

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      setShowAddDevice(true);
    } else {
      // Remove all credentials to disable biometric
      for (const cred of credentials) {
        await removeCredential(cred.id);
      }
      setCredentials([]);
      setShowAddDevice(false);
    }
  };

  const handleRegister = async () => {
    const success = await registerBiometric(deviceName || undefined);
    if (success) {
      setDeviceName('');
      setShowAddDevice(false);
      await loadCredentials();
    }
  };

  const handleRemove = async (id: string) => {
    await removeCredential(id);
    await loadCredentials();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Biometric Sign-In
            </CardTitle>
            <CardDescription>
              {isSupported
                ? 'Use fingerprint or face unlock to sign in quickly'
                : 'Not available on this device/browser'}
            </CardDescription>
          </div>
          {isSupported && (
            <Switch
              checked={biometricEnabled || showAddDevice}
              onCheckedChange={handleToggle}
              disabled={loading}
            />
          )}
        </div>
      </CardHeader>

      {isSupported && (biometricEnabled || showAddDevice) && (
        <CardContent className="space-y-4">
          {credentials.length > 0 && (
            <div className="space-y-3">
              <Label>Registered Devices</Label>
              {credentials.map((cred) => (
                <div key={cred.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{cred.device_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(cred.created_at).toLocaleDateString()}
                        {cred.last_used_at && ` · Last used ${new Date(cred.last_used_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRemove(cred.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {(showAddDevice || credentials.length === 0) && (
            <div className="space-y-3 rounded-lg border border-dashed p-4">
              <div className="space-y-2">
                <Label htmlFor="device-name">Device Name (optional)</Label>
                <Input
                  id="device-name"
                  placeholder="e.g. My iPhone, Work Laptop"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleRegister} disabled={loading} size="sm" className="gap-2">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Fingerprint className="h-4 w-4" />
                  )}
                  Register Device
                </Button>
                {credentials.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setShowAddDevice(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}

          {credentials.length > 0 && !showAddDevice && (
            <Button variant="outline" size="sm" onClick={() => setShowAddDevice(true)} className="gap-2">
              <Fingerprint className="h-4 w-4" />
              Add Another Device
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    avatar_url: '',
    timezone: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive',
      });
    } else if (data) {
      setProfile({
        full_name: data.full_name || '',
        email: data.email || '',
        avatar_url: data.avatar_url || '',
        timezone: (data as any).timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      });
    }
    setLoading(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Avatar image must be less than 2MB',
          variant: 'destructive',
        });
        return;
      }
      setAvatarFile(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      let avatarUrl = profile.avatar_url;

      // Upload new avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('deliverables')
          .upload(`avatars/${fileName}`, avatarFile);

        if (uploadError) {
          throw new Error('Failed to upload avatar');
        }

        const { data: publicUrl } = supabase.storage
          .from('deliverables')
          .getPublicUrl(`avatars/${fileName}`);
        
        avatarUrl = publicUrl.publicUrl;
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          avatar_url: avatarUrl,
          timezone: profile.timezone,
        } as any)
        .eq('id', user.id);

      if (error) throw error;

      setProfile((prev) => ({ ...prev, avatar_url: avatarUrl }));
      setAvatarFile(null);

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    
    setSaving(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send password reset email',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Email Sent',
        description: 'Check your email for password reset instructions',
      });
    }
    setSaving(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="general" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              General
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information and avatar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarFile ? URL.createObjectURL(avatarFile) : profile.avatar_url} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {getInitials(profile.full_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Label htmlFor="avatar" className="cursor-pointer">
                      <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Camera className="h-4 w-4" />
                        Change Avatar
                      </div>
                    </Label>
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </div>

                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => setProfile((prev) => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email Field (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                {/* Timezone Field */}
                <div className="space-y-2">
                  <Label htmlFor="timezone" className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Timezone
                  </Label>
                  <Select
                    value={profile.timezone}
                    onValueChange={(value) => setProfile((prev) => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {[
                        'UTC','Africa/Lagos','Africa/Cairo','Africa/Johannesburg','Africa/Nairobi',
                        'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
                        'America/Sao_Paulo','America/Toronto','Asia/Dubai','Asia/Kolkata','Asia/Shanghai',
                        'Asia/Tokyo','Asia/Singapore','Australia/Sydney','Europe/London','Europe/Berlin',
                        'Europe/Paris','Europe/Moscow','Pacific/Auckland',
                      ].map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Used for morning meeting reminders at ~7 AM your time
                  </p>
                </div>

                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>Change your password by requesting a reset link</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleChangePassword} variant="outline" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Password Reset Email'
                    )}
                  </Button>
                </CardContent>
              </Card>

              <BiometricSettingsCard />
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsTab />
          </TabsContent>

          <TabsContent value="general">
            <OnboardingResetCard />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
