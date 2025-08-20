import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Users, Clock, ChefHat, Utensils, ArrowRight, Smartphone } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
}

interface DeviceSession {
  id: string;
  session_token: string;
  device_ip: string;
  table_number: string;
  restaurant_id: string;
  created_at: string;
  is_main_device: boolean;
  expires_at: string;
  order_data: any;
  last_activity: string;
}

const QRWelcome = () => {
  const { restaurantId, tableNumber } = useParams<{ restaurantId: string; tableNumber: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [showSessionOptions, setShowSessionOptions] = useState(false);
  const [existingSessions, setExistingSessions] = useState<DeviceSession[]>([]);
  const [selectedAction, setSelectedAction] = useState<'new' | 'join' | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deviceIp, setDeviceIp] = useState<string>('');

  // Get device IP
  useEffect(() => {
    const getDeviceIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setDeviceIp(data.ip);
      } catch (error) {
        console.error('Failed to get IP:', error);
        setDeviceIp('unknown');
      }
    };
    getDeviceIp();
  }, []);

  // Fetch restaurant data
  const { data: restaurant, isLoading: restaurantLoading, error: restaurantError } = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: async (): Promise<Restaurant> => {
      if (!restaurantId) throw new Error('Restaurant ID is required');
      
      const { data, error } = await supabase
        .from('restaurants_public')
        .select('id, name, description, logo_url')
        .eq('id', restaurantId)
        .maybeSingle();

      if (error) throw new Error(`Restaurant not found: ${error.message}`);
      if (!data) throw new Error('Restaurant not found or is inactive');

      return data as Restaurant;
    },
    enabled: !!restaurantId,
    retry: 2,
  });

  // Check for existing sessions
  useEffect(() => {
    const checkExistingSessions = async () => {
      if (!restaurantId || !tableNumber || !deviceIp) return;

      console.log('Checking existing sessions for:', { restaurantId, tableNumber, deviceIp });

      try {
        // Clean up expired sessions first
        await supabase.rpc('cleanup_expired_sessions');

        // Check for active sessions on this table - simplified query for better reliability
        const { data, error } = await supabase
          .from('device_sessions')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .eq('table_number', tableNumber)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        console.log('Session query result:', { data, error });

        if (error) {
          console.error('Error checking sessions:', error);
          // Even if there's an error, proceed to session creation
          setShowSessionOptions(false);
          setLoading(false);
          return;
        }

        // Filter out sessions from the same device IP
        const otherDeviceSessions = data?.filter(session => session.device_ip !== deviceIp) || [];
        
        console.log('Other device sessions found:', otherDeviceSessions.length);
        
        if (otherDeviceSessions.length > 0) {
          setExistingSessions(otherDeviceSessions);
          setShowSessionOptions(true);
        } else {
          // No other devices, proceed directly to new session creation
          setShowSessionOptions(false);
        }
      } catch (error) {
        console.error('Error in checkExistingSessions:', error);
        // On any error, proceed to session creation
        setShowSessionOptions(false);
      } finally {
        setLoading(false);
      }
    };

    // Show welcome screen for 2 seconds then check sessions
    const timer = setTimeout(() => {
      checkExistingSessions();
    }, 2000);

    return () => clearTimeout(timer);
  }, [restaurantId, tableNumber, deviceIp]);

  const handleCreateNewSession = async () => {
    if (!customerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to continue.",
        variant: "destructive",
      });
      return;
    }

    console.log('Creating new session for:', { restaurantId, tableNumber, deviceIp, customerName });

    try {
      // Create session token with device IP and cryptographic randomness
      const sessionToken = `${deviceIp}-${Date.now()}-${crypto.randomUUID()}`;
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

      console.log('Generated session token:', sessionToken);

      // End any existing sessions for this table if starting new
      if (showSessionOptions) {
        console.log('Deleting existing sessions for table');
        await supabase
          .from('device_sessions')
          .delete()
          .eq('restaurant_id', restaurantId!)
          .eq('table_number', tableNumber!);
      }

      // Insert the new session
      console.log('Inserting new session');
      const { data, error } = await supabase
        .from('device_sessions')
        .insert({
          session_token: sessionToken,
          device_ip: deviceIp,
          table_number: tableNumber!,
          restaurant_id: restaurantId!,
          is_main_device: true,
          expires_at: expiresAt.toISOString(),
          order_data: [],
        })
        .select()
        .single();

      console.log('Session creation result:', { data, error });

      if (error) {
        console.error('Session creation error:', error);
        throw error;
      }

      // Store session info in localStorage
      localStorage.setItem('session_token', sessionToken);
      localStorage.setItem('customer_name', customerName);

      console.log('Session stored in localStorage, navigating to menu');

      toast({
        title: "Session Created",
        description: `Welcome ${customerName}! You are now the main device for table ${tableNumber}.`,
      });

      navigate(`/menu/${restaurantId}/${tableNumber}`);
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Session Creation Failed",
        description: `Failed to create new session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleJoinExistingSession = async () => {
    if (!customerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to continue.",
        variant: "destructive",
      });
      return;
    }

    console.log('Joining existing session for:', { restaurantId, tableNumber, deviceIp, customerName });

    try {
      // Create session token with device IP and cryptographic randomness
      const sessionToken = `${deviceIp}-${Date.now()}-${crypto.randomUUID()}`;
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

      console.log('Generated join session token:', sessionToken);

      const { data, error } = await supabase
        .from('device_sessions')
        .insert({
          session_token: sessionToken,
          device_ip: deviceIp,
          table_number: tableNumber!,
          restaurant_id: restaurantId!,
          is_main_device: false,
          expires_at: expiresAt.toISOString(),
          order_data: [],
        })
        .select()
        .single();

      console.log('Join session result:', { data, error });

      if (error) {
        console.error('Join session error:', error);
        throw error;
      }

      // Store session info in localStorage
      localStorage.setItem('session_token', sessionToken);
      localStorage.setItem('customer_name', customerName);

      console.log('Join session stored in localStorage, navigating to menu');

      toast({
        title: "Joined Session",
        description: `Welcome ${customerName}! You've joined the existing session for table ${tableNumber}.`,
      });

      navigate(`/menu/${restaurantId}/${tableNumber}`);
    } catch (error) {
      console.error('Error joining session:', error);
      toast({
        title: "Join Session Failed",
        description: `Failed to join existing session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const confirmAction = () => {
    setShowConfirmDialog(false);
    if (selectedAction === 'new') {
      handleCreateNewSession();
    } else if (selectedAction === 'join') {
      handleJoinExistingSession();
    }
  };

  // Early return for missing params
  if (!restaurantId || !tableNumber) {
    toast({
      title: "Invalid QR Code",
      description: "The QR code appears to be invalid.",
      variant: "destructive",
    });
    navigate('/');
    return null;
  }

  // Loading state
  if (loading || restaurantLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm w-full animate-fade-in">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
            <span className="text-3xl font-bold text-white">Z</span>
          </div>
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-orange-600 animate-slide-up">
              Welcome to ZapDine
            </h1>
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
              <span>Preparing your dining experience...</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center animate-bounce" style={{ animationDelay: '0.1s' }}>
                <ChefHat className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Fresh Menu</p>
              </div>
              <div className="text-center animate-bounce" style={{ animationDelay: '0.2s' }}>
                <Utensils className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Quick Orders</p>
              </div>
              <div className="text-center animate-bounce" style={{ animationDelay: '0.3s' }}>
                <Smartphone className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Smart Dining</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (restaurantError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="text-center py-8 px-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold text-red-600 mb-2">Restaurant Not Found</h3>
            <p className="text-gray-600 mb-4 text-sm">
              The restaurant associated with this QR code could not be found.
            </p>
            <Button onClick={() => navigate('/')} className="bg-orange-500 hover:bg-orange-600 w-full">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session options screen
  if (showSessionOptions) {
    const mainSession = existingSessions.find(s => s.is_main_device);
    const totalOrders = mainSession?.order_data?.length || 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              {restaurant?.logo_url ? (
                <img src={restaurant.logo_url} alt="Logo" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">{restaurant?.name?.charAt(0) || 'R'}</span>
              )}
            </div>
            <CardTitle className="text-xl text-orange-600 mb-2">{restaurant?.name}</CardTitle>
            <p className="text-sm text-gray-600">Table {tableNumber}</p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">Active Session Found</span>
              </div>
              <div className="space-y-2 text-sm text-blue-700">
                <div className="flex items-center justify-between">
                  <span>Devices connected:</span>
                  <span className="font-medium">{existingSessions.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Orders placed:</span>
                  <span className="font-medium">{totalOrders}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Session active since {new Date(mainSession?.created_at || '').toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="customerName" className="text-sm font-medium text-gray-700">
                Enter your name to continue:
              </Label>
              <Input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Your name"
                className="focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={() => {
                  setSelectedAction('join');
                  setShowConfirmDialog(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full py-3"
                disabled={!customerName.trim()}
              >
                <Users className="w-4 h-4 mr-2" />
                Join Existing Session
              </Button>
              
              <Button
                onClick={() => {
                  setSelectedAction('new');
                  setShowConfirmDialog(true);
                }}
                variant="outline"
                className="border-orange-300 text-orange-600 hover:bg-orange-50 w-full py-3"
                disabled={!customerName.trim()}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Start New Session
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500">
              Joining will share orders, bills, and session data with other devices.
            </p>
          </CardContent>
        </Card>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {selectedAction === 'new' ? 'Start New Session?' : 'Join Existing Session?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedAction === 'new' 
                  ? `Starting a new session will end the current active session for table ${tableNumber}. All devices will need to rejoin.`
                  : `You'll join the existing session for table ${tableNumber} and share orders, bills, and session data with other connected devices.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmAction}
                className={selectedAction === 'new' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}
              >
                {selectedAction === 'new' ? 'Start New Session' : 'Join Session'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // New session screen (no existing sessions)
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            {restaurant?.logo_url ? (
              <img src={restaurant.logo_url} alt="Logo" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">{restaurant?.name?.charAt(0) || 'R'}</span>
            )}
          </div>
          <CardTitle className="text-xl text-orange-600 mb-2">{restaurant?.name}</CardTitle>
          <p className="text-sm text-gray-600">Table {tableNumber}</p>
          {restaurant?.description && (
            <p className="text-xs text-gray-500 mt-2">{restaurant.description}</p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Welcome to Your Table!</h3>
            <p className="text-sm text-gray-600">
              You're about to start a new dining session. Enter your name to begin ordering.
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="customerName" className="text-sm font-medium text-gray-700">
              Enter your name:
            </Label>
            <Input
              id="customerName"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Your name"
              className="focus:border-orange-500 focus:ring-orange-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && customerName.trim()) {
                  handleCreateNewSession();
                }
              }}
            />
          </div>

          <Button
            onClick={handleCreateNewSession}
            className="bg-orange-600 hover:bg-orange-700 text-white w-full py-3"
            disabled={!customerName.trim()}
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Start Dining Session
          </Button>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <ChefHat className="w-6 h-6 text-orange-500 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Fresh Menu</p>
            </div>
            <div className="text-center">
              <Utensils className="w-6 h-6 text-orange-500 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Quick Orders</p>
            </div>
            <div className="text-center">
              <Smartphone className="w-6 h-6 text-orange-500 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Smart Dining</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRWelcome;