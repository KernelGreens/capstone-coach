import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

function base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = window.atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function useBiometricAuth() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        if (typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials) {
          setIsSupported(false);
          return;
        }
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsSupported(available);
      } catch {
        setIsSupported(false);
      }
    };
    check();
  }, []);

  const checkPlatformAuthenticator = useCallback(async (): Promise<boolean> => {
    if (!window.PublicKeyCredential) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }, []);

  const registerBiometric = useCallback(async (deviceName?: string) => {
    if (!user) return false;

    const available = await checkPlatformAuthenticator();
    if (!available) {
      toast({
        variant: 'destructive',
        title: 'Not supported',
        description: 'Your device does not support biometric authentication.',
      });
      return false;
    }

    setLoading(true);
    try {
      // Get registration options from server
      const { data: optionsData, error: optionsError } = await supabase.functions.invoke('webauthn', {
        body: { action: 'register-options' },
      });

      if (optionsError) throw new Error(optionsError.message);

      const options = optionsData.options;

      // Create credential using WebAuthn API
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: base64UrlToArrayBuffer(options.challenge),
          rp: options.rp,
          user: {
            ...options.user,
            id: base64UrlToArrayBuffer(options.user.id),
          },
          pubKeyCredParams: options.pubKeyCredParams,
          authenticatorSelection: options.authenticatorSelection,
          timeout: options.timeout,
          attestation: options.attestation,
        },
      }) as PublicKeyCredential;

      if (!credential) throw new Error('Credential creation failed');

      const response = credential.response as AuthenticatorAttestationResponse;

      // Store credential in database
      const { error: storeError } = await supabase.from('webauthn_credentials').insert({
        user_id: user.id,
        credential_id: arrayBufferToBase64Url(credential.rawId),
        public_key: arrayBufferToBase64Url(response.getPublicKey()!),
        counter: 0,
        device_name: deviceName || getDeviceName(),
      });

      if (storeError) throw storeError;

      toast({
        title: 'Biometric sign-in enabled',
        description: 'You can now use your fingerprint or face to sign in.',
      });
      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        toast({
          variant: 'destructive',
          title: 'Cancelled',
          description: 'Biometric registration was cancelled.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Registration failed',
          description: err.message || 'Could not register biometric credential.',
        });
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast, checkPlatformAuthenticator]);

  const authenticateWithBiometric = useCallback(async (email: string): Promise<boolean> => {
    const available = await checkPlatformAuthenticator();
    if (!available) return false;

    setLoading(true);
    try {
      // Look up credentials for this email
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!profile) {
        toast({
          variant: 'destructive',
          title: 'No account found',
          description: 'No biometric credentials found for this email.',
        });
        return false;
      }

      // Get stored credentials for this user
      const { data: credentials } = await supabase
        .from('webauthn_credentials')
        .select('credential_id')
        .eq('user_id', profile.id);

      if (!credentials || credentials.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No biometrics registered',
          description: 'Please sign in with your password first, then enable biometrics in Settings.',
        });
        return false;
      }

      // Trigger WebAuthn authentication
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: window.location.hostname,
          allowCredentials: credentials.map((c) => ({
            id: base64UrlToArrayBuffer(c.credential_id),
            type: 'public-key' as const,
            transports: ['internal' as const],
          })),
          userVerification: 'required',
          timeout: 60000,
        },
      }) as PublicKeyCredential;

      if (!assertion) return false;

      // Biometric verified locally — sign in with stored session
      // Since WebAuthn only proves device possession, we use it as a convenience
      // The actual Supabase session is restored from localStorage
      const { data: session } = await supabase.auth.getSession();
      if (session?.session) {
        // Update last used
        await supabase
          .from('webauthn_credentials')
          .update({ last_used_at: new Date().toISOString() })
          .eq('credential_id', arrayBufferToBase64Url(assertion.rawId));

        toast({
          title: 'Welcome back!',
          description: 'Signed in with biometrics.',
        });
        return true;
      }

      // No existing session — biometric alone can't create a new Supabase session
      toast({
        variant: 'destructive',
        title: 'Session expired',
        description: 'Please sign in with your password. Biometric sign-in works for returning to an active session.',
      });
      return false;
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        // User cancelled
        return false;
      }
      toast({
        variant: 'destructive',
        title: 'Authentication failed',
        description: err.message || 'Biometric authentication failed.',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast, checkPlatformAuthenticator]);

  const getRegisteredCredentials = useCallback(async () => {
    if (!user) return [];
    const { data } = await supabase
      .from('webauthn_credentials')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    return data || [];
  }, [user]);

  const removeCredential = useCallback(async (credentialId: string) => {
    if (!user) return;
    await supabase
      .from('webauthn_credentials')
      .delete()
      .eq('id', credentialId)
      .eq('user_id', user.id);
    toast({
      title: 'Credential removed',
      description: 'Biometric credential has been removed.',
    });
  }, [user, toast]);

  return {
    isSupported,
    loading,
    registerBiometric,
    authenticateWithBiometric,
    getRegisteredCredentials,
    removeCredential,
    checkPlatformAuthenticator,
  };
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android device';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux device';
  return 'Unknown device';
}
