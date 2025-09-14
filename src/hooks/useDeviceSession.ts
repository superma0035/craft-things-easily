import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sessionTokenManager, createSupabaseClientWithSession } from '@/lib/supabaseClient';

interface DeviceSession {
  id: string;
  sessionToken: string;
  deviceIp: string;
  tableNumber: string;
  restaurantId: string;
  startTime: Date;
  isMainDevice: boolean;
  expiresAt: Date;
  orderData: any[];
}

export const useDeviceSession = (restaurantId?: string, tableNumber?: string) => {
  const [session, setSession] = useState<DeviceSession | null>(null);
  const [deviceIp, setDeviceIp] = useState<string>('');
  const [isMainDevice, setIsMainDevice] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string>('');

  // Get device IP and create session token
  useEffect(() => {
    const getDeviceInfo = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        const ip = data.ip;
        setDeviceIp(ip);
        
        // Create unique session token with cryptographic randomness (must include underscores for RLS validation)
        const token = `${ip}_${Date.now()}_${crypto.randomUUID()}`;
        setSessionToken(token);
      } catch (error) {
        console.error('Failed to get IP:', error);
        const fallbackIp = `fallback-${Date.now()}`;
        setDeviceIp(fallbackIp);
        const token = `${fallbackIp}_${Date.now()}_${crypto.randomUUID()}`;
        setSessionToken(token);
      }
    };
    getDeviceInfo();
  }, []);

  // Initialize or restore session
  useEffect(() => {
    if (!restaurantId || !tableNumber || !deviceIp || !sessionToken) {
      setSessionLoading(false);
      return;
    }

    const initializeSession = async () => {
      try {
        // Clean up expired sessions first
        await supabase.rpc('cleanup_expired_sessions');

        // Check for existing active sessions for this table
        const { data: existingSessions, error: fetchError } = await supabase
          .from('device_sessions')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .eq('table_number', tableNumber)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: true });

        if (fetchError) {
          console.warn('Error fetching sessions (continuing with new session):', fetchError);
        }

        const mainDeviceSession = existingSessions?.find(s => s.is_main_device);

        if (mainDeviceSession && mainDeviceSession.device_ip !== deviceIp) {
          // Another device is the main device
          setSession({
            id: mainDeviceSession.id,
            sessionToken: mainDeviceSession.session_token,
            deviceIp: mainDeviceSession.device_ip,
            tableNumber: mainDeviceSession.table_number,
            restaurantId: mainDeviceSession.restaurant_id,
            startTime: new Date(mainDeviceSession.created_at),
            isMainDevice: false,
            expiresAt: new Date(mainDeviceSession.expires_at),
            orderData: Array.isArray(mainDeviceSession.order_data) ? mainDeviceSession.order_data : []
          });
          setIsMainDevice(false);
        } else {
          // This device can become the main device
          // Set session token for authentication
          sessionTokenManager.setSessionToken(sessionToken);
          const supabaseWithSession = createSupabaseClientWithSession();
          
          const { data: newSession, error: createError } = await supabaseWithSession
            .from('device_sessions')
            .insert({
              restaurant_id: restaurantId,
              table_number: tableNumber,
              device_ip: deviceIp,
              session_token: sessionToken,
              is_main_device: true,
              expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating session:', createError);
            setSessionLoading(false);
            return;
          }

          setSession({
            id: newSession.id,
            sessionToken: newSession.session_token,
            deviceIp: newSession.device_ip,
            tableNumber: newSession.table_number,
            restaurantId: newSession.restaurant_id,
            startTime: new Date(newSession.created_at),
            isMainDevice: true,
            expiresAt: new Date(newSession.expires_at),
            orderData: Array.isArray(newSession.order_data) ? newSession.order_data : []
          });
          setIsMainDevice(true);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
      } finally {
        setSessionLoading(false);
      }
    };

    initializeSession();
  }, [restaurantId, tableNumber, deviceIp, sessionToken]);

  const takeOverSession = async () => {
    if (!restaurantId || !tableNumber || !deviceIp || !sessionToken) return;

    try {
      // Set session token for authentication
      sessionTokenManager.setSessionToken(sessionToken);
      const supabaseWithSession = createSupabaseClientWithSession();
      
      // Create new session for this device
      const { data: newSession, error: createError } = await supabaseWithSession
        .from('device_sessions')
        .insert({
          restaurant_id: restaurantId,
          table_number: tableNumber,
          device_ip: deviceIp,
          session_token: sessionToken,
          is_main_device: false, // Start as non-main, will be updated by transfer function
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating new session:', createError);
        return;
      }

      // Find the current main device session
      const { data: currentMainSession } = await supabase
        .from('device_sessions')
        .select('session_token')
        .eq('restaurant_id', restaurantId)
        .eq('table_number', tableNumber)
        .eq('is_main_device', true)
        .single();

      if (currentMainSession) {
        // Transfer main device status using the database function
        const { data: transferResult, error: transferError } = await supabaseWithSession
          .rpc('transfer_main_device', {
            old_session_token: currentMainSession.session_token,
            new_session_token: sessionToken
          });

        if (transferError) {
          console.error('Error transferring session:', transferError);
          return;
        }
      } else {
        // No current main device, just update this session to be main
        await supabaseWithSession
          .from('device_sessions')
          .update({ is_main_device: true })
          .eq('session_token', sessionToken);
      }

      // Update local state
      setSession(prev => prev ? { ...prev, isMainDevice: true } : null);
      setIsMainDevice(true);
    } catch (error) {
      console.error('Error taking over session:', error);
    }
  };

  const endSession = async () => {
    if (!sessionToken) return;

    try {
      sessionTokenManager.setSessionToken(sessionToken);
      const supabaseWithSession = createSupabaseClientWithSession();
      
      await supabaseWithSession
        .from('device_sessions')
        .delete()
        .eq('session_token', sessionToken);

      sessionTokenManager.clearSessionToken();
      setSession(null);
      setIsMainDevice(false);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const updateOrderData = async (orderData: any[]) => {
    if (!sessionToken) return;

    try {
      sessionTokenManager.setSessionToken(sessionToken);
      const supabaseWithSession = createSupabaseClientWithSession();
      
      await supabaseWithSession
        .from('device_sessions')
        .update({ 
          order_data: orderData,
          last_activity: new Date().toISOString()
        })
        .eq('session_token', sessionToken);

      setSession(prev => prev ? { ...prev, orderData } : null);
    } catch (error) {
      console.error('Error updating order data:', error);
    }
  };

  const getTimeLeft = (): number => {
    if (!session) return 0;
    return Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
  };

  return {
    session,
    deviceIp,
    isMainDevice,
    sessionLoading,
    takeOverSession,
    endSession,
    updateOrderData,
    getTimeLeft
  };
};