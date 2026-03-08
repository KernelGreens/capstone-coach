import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// VAPID public key - this is safe to expose client-side
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

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

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, [user]);

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
    if (!user || !isSupported || !VAPID_PUBLIC_KEY) {
      toast({
        variant: 'destructive',
        title: 'Push notifications unavailable',
        description: 'Your browser does not support push notifications or VAPID key is missing.',
      });
      return;
    }

    setLoading(true);

    try {
      // Request notification permission
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

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      const subJson = subscription.toJSON();

      // Store subscription in database
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
  }, [user, isSupported, toast]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
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
