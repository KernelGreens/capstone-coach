import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string>('');

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
      fetchVapidKey();
    }
  }, [user]);

  const fetchVapidKey = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-vapid-key');
      if (!error && data?.vapidPublicKey) {
        setVapidPublicKey(data.vapidPublicKey);
      }
    } catch {
      console.error('Failed to fetch VAPID key');
    }
  };

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch {
      setIsSubscribed(false);
    }
  };

  const subscribe = useCallback(async () => {
    if (!user || !isSupported || !vapidPublicKey) {
      toast({
        variant: 'destructive',
        title: 'Push notifications unavailable',
        description: !vapidPublicKey
          ? 'Push notification configuration is not ready. Please try again.'
          : 'Your browser does not support push notifications.',
      });
      return;
    }

    setLoading(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        toast({
          variant: 'destructive',
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings.',
        });
        return;
      }

      // Register custom push service worker
      const registration = await navigator.serviceWorker.register('/sw-push.js');
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });

      const subJson = subscription.toJSON();

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
        },
        { onConflict: 'user_id,endpoint' }
      );

      if (error) throw error;

      setIsSubscribed(true);
      toast({
        title: 'Notifications enabled',
        description: 'You will now receive push notifications for meetings, deadlines, and updates.',
      });
    } catch (err: any) {
      console.error('Push subscription error:', err);
      toast({
        variant: 'destructive',
        title: 'Subscription failed',
        description: err.message || 'Could not enable push notifications.',
      });
    } finally {
      setLoading(false);
    }
  }, [user, isSupported, vapidPublicKey, toast]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      toast({
        title: 'Notifications disabled',
        description: 'You will no longer receive push notifications.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Could not disable push notifications.',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
  };
}
