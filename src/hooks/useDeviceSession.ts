import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DeviceSession {
  sessionId: string;
  deviceIp: string;
  tableNumber: string;
  restaurantId: string;
  startTime: Date;
  isMainDevice: boolean;
  expiresAt: Date;
}

export const useDeviceSession = (restaurantId?: string, tableNumber?: string) => {
  const [session, setSession] = useState<DeviceSession | null>(null);
  const [deviceIp, setDeviceIp] = useState<string>('');
  const [isMainDevice, setIsMainDevice] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Get device IP
  useEffect(() => {
    const getDeviceIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setDeviceIp(data.ip);
      } catch (error) {
        console.error('Failed to get IP:', error);
        setDeviceIp(`fallback-${Date.now()}`);
      }
    };
    getDeviceIp();
  }, []);

  // Initialize or restore session
  useEffect(() => {
    if (!restaurantId || !tableNumber || !deviceIp) {
      setSessionLoading(false);
      return;
    }

    const initializeSession = async () => {
      const sessionKey = `table-session-${restaurantId}-${tableNumber}`;
      const storedSession = localStorage.getItem(sessionKey);

      if (storedSession) {
        try {
          const parsed: DeviceSession = JSON.parse(storedSession);
          parsed.startTime = new Date(parsed.startTime);
          parsed.expiresAt = new Date(parsed.expiresAt);

          // Check if session is still valid
          if (new Date() < parsed.expiresAt) {
            // Check if this is the same device
            if (parsed.deviceIp === deviceIp) {
              setSession(parsed);
              setIsMainDevice(parsed.isMainDevice);
              setSessionLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error('Error parsing stored session:', error);
        }
      }

      // Create new session or check for existing session from another device
      const existingSessions = getAllTableSessions(restaurantId, tableNumber);
      const activeSession = existingSessions.find(s => new Date() < s.expiresAt);

      if (activeSession && activeSession.deviceIp !== deviceIp) {
        // Another device has an active session
        setIsMainDevice(false);
        setSession(activeSession);
      } else {
        // Create new session for this device
        const newSession: DeviceSession = {
          sessionId: `${restaurantId}-${tableNumber}-${Date.now()}`,
          deviceIp,
          tableNumber,
          restaurantId,
          startTime: new Date(),
          isMainDevice: true,
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
        };

        localStorage.setItem(sessionKey, JSON.stringify(newSession));
        setSession(newSession);
        setIsMainDevice(true);
      }

      setSessionLoading(false);
    };

    initializeSession();
  }, [restaurantId, tableNumber, deviceIp]);

  const getAllTableSessions = (restaurantId: string, tableNumber: string): DeviceSession[] => {
    const sessions: DeviceSession[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`table-session-${restaurantId}-${tableNumber}`)) {
        try {
          const session = JSON.parse(localStorage.getItem(key) || '');
          session.startTime = new Date(session.startTime);
          session.expiresAt = new Date(session.expiresAt);
          sessions.push(session);
        } catch (error) {
          console.error('Error parsing session:', error);
        }
      }
    }
    return sessions;
  };

  const takeOverSession = () => {
    if (!restaurantId || !tableNumber || !deviceIp) return;

    const newSession: DeviceSession = {
      sessionId: `${restaurantId}-${tableNumber}-${Date.now()}`,
      deviceIp,
      tableNumber,
      restaurantId,
      startTime: new Date(),
      isMainDevice: true,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    };

    const sessionKey = `table-session-${restaurantId}-${tableNumber}`;
    localStorage.setItem(sessionKey, JSON.stringify(newSession));
    setSession(newSession);
    setIsMainDevice(true);
  };

  const endSession = () => {
    if (!restaurantId || !tableNumber) return;

    const sessionKey = `table-session-${restaurantId}-${tableNumber}`;
    localStorage.removeItem(sessionKey);
    setSession(null);
    setIsMainDevice(false);
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
    getTimeLeft
  };
};