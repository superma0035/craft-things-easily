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
      const sessionKey = `table-session-${restaurantId}-${tableNumber}-${deviceIp}`;
      const storedSession = localStorage.getItem(sessionKey);

      if (storedSession) {
        try {
          const parsed: DeviceSession = JSON.parse(storedSession);
          if (!parsed.startTime || !parsed.expiresAt) {
            localStorage.removeItem(sessionKey);
            throw new Error('Invalid session data');
          }
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
          // Remove corrupted session data
          localStorage.removeItem(sessionKey);
        }
      }

      // Create new session or check for existing session from another device
      const existingSessions = getAllTableSessions(restaurantId, tableNumber);
      const activeSession = existingSessions.find(s => new Date() < s.expiresAt);

      if (activeSession && activeSession.deviceIp !== deviceIp) {
        // Another device has an active session - this device is not main
        setIsMainDevice(false);
        setSession(activeSession);
      } else {
        // This is the first device or taking over expired session
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
    
    // Check all possible session keys for this table
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`table-session-${restaurantId}-${tableNumber}`)) {
        try {
          const sessionData = localStorage.getItem(key);
          if (sessionData) {
            const session = JSON.parse(sessionData);
            if (session && session.startTime && session.expiresAt) {
              session.startTime = new Date(session.startTime);
              session.expiresAt = new Date(session.expiresAt);
              
              // Only include active sessions
              if (new Date() < session.expiresAt) {
                sessions.push(session);
              } else {
                // Remove expired sessions
                localStorage.removeItem(key);
              }
            }
          }
        } catch (error) {
          console.error('Error parsing session:', error);
          // Remove corrupted session data
          if (key) localStorage.removeItem(key);
        }
      }
    }
    return sessions;
  };

  const takeOverSession = () => {
    if (!restaurantId || !tableNumber || !deviceIp) return;

    // Remove all other sessions for this table to prevent conflicts
    const allSessions = getAllTableSessions(restaurantId, tableNumber);
    allSessions.forEach(oldSession => {
      const oldKey = `table-session-${restaurantId}-${tableNumber}-${oldSession.deviceIp}`;
      localStorage.removeItem(oldKey);
    });

    const newSession: DeviceSession = {
      sessionId: `${restaurantId}-${tableNumber}-${Date.now()}`,
      deviceIp,
      tableNumber,
      restaurantId,
      startTime: new Date(),
      isMainDevice: true,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    };

    const sessionKey = `table-session-${restaurantId}-${tableNumber}-${deviceIp}`;
    localStorage.setItem(sessionKey, JSON.stringify(newSession));
    setSession(newSession);
    setIsMainDevice(true);
  };

  const endSession = () => {
    if (!restaurantId || !tableNumber) return;

    // Remove session for this specific device
    const sessionKey = `table-session-${restaurantId}-${tableNumber}-${deviceIp}`;
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