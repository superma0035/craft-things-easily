import { useAuth as useAuthContext } from '@/contexts/AuthContext';

/**
 * Re-export the auth hook from context
 * Provides user, session, and auth methods
 */
export const useAuth = useAuthContext;

export default useAuth;