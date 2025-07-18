
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useDeviceSession } from '@/hooks/useDeviceSession';
import MobileMenuHeader from '@/components/customer/MobileMenuHeader';
import MobileMenuSearch from '@/components/customer/MobileMenuSearch';
import MobileMenuGrid from '@/components/customer/MobileMenuGrid';
import MobileCartModal from '@/components/customer/MobileCartModal';
import OrderStatusTracker from '@/components/customer/OrderStatusTracker';
import OrderHistory from '@/components/customer/OrderHistory';
import OrderDetailsModal from '@/components/customer/OrderDetailsModal';
import DeviceTransferModal from '@/components/customer/DeviceTransferModal';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
}

interface CartItem extends MenuItem {
  quantity: number;
}

const CustomerMenu = () => {
  const { restaurantId, tableNumber } = useParams<{ restaurantId: string; tableNumber: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showBillDialog, setShowBillDialog] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Device session management
  const { 
    session, 
    deviceIp, 
    isMainDevice, 
    sessionLoading, 
    takeOverSession, 
    endSession, 
    updateOrderData,
    getTimeLeft 
  } = useDeviceSession(restaurantId, tableNumber);

  // Refresh confirmation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (cart.length > 0 || (session && isMainDevice)) {
        e.preventDefault();
        e.returnValue = 'You have items in your cart or an active session. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cart.length, session, isMainDevice]);

  // Session timer using device session
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0);
  
  useEffect(() => {
    if (!session) return;

    const updateTimer = () => {
      const timeLeft = getTimeLeft();
      setSessionTimeLeft(timeLeft);
      
      if (timeLeft <= 0) {
        toast({
          title: "Session Expired",
          description: "Your dining session has expired.",
          variant: "destructive",
        });
        endSession();
        navigate('/');
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [session, getTimeLeft, endSession, navigate, toast]);

  // Show transfer modal if not main device and has active session from another device
  useEffect(() => {
    if (!sessionLoading && session && !isMainDevice && session.deviceIp !== deviceIp) {
      setShowTransferModal(true);
    }
  }, [session, isMainDevice, sessionLoading, deviceIp]);

  // Validate required params and redirect if missing
  useEffect(() => {
    console.log('Current params:', { restaurantId, tableNumber });
    
    if (!restaurantId || !tableNumber) {
      console.error('Missing required parameters:', { restaurantId, tableNumber });
      toast({
        title: "Invalid QR Code",
        description: "The QR code appears to be invalid. Please scan a valid restaurant QR code.",
        variant: "destructive",
      });
      // Add a small delay before redirect to ensure the error is visible
      setTimeout(() => navigate('/'), 2000);
      return;
    }

    // Validate that restaurantId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(restaurantId)) {
      console.error('Invalid restaurant ID format:', restaurantId);
      toast({
        title: "Invalid Restaurant ID",
        description: "The restaurant ID in the QR code is invalid.",
        variant: "destructive",
      });
      setTimeout(() => navigate('/'), 2000);
      return;
    }

    console.log('Parameters validated successfully');
  }, [restaurantId, tableNumber, navigate, toast]);

  const fetchMenuItems = async (): Promise<MenuItem[]> => {
    if (!restaurantId) throw new Error('Restaurant ID is required');
    
    console.log('Fetching menu items for restaurant:', restaurantId);
    
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, description, price, image_url')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Supabase error fetching menu items:', error);
        setConnectionError(true);
        throw new Error(`Database connection failed: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('No menu items found for restaurant:', restaurantId);
        return [];
      }

      console.log('Menu items fetched successfully:', data.length);
      setConnectionError(false);
      return data as MenuItem[];
    } catch (error) {
      console.error('Error in fetchMenuItems:', error);
      setConnectionError(true);
      throw error;
    }
  };

  const fetchRestaurant = async (): Promise<Restaurant> => {
    if (!restaurantId) throw new Error('Restaurant ID is required');
    
    console.log('Fetching restaurant:', restaurantId);
    
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, description')
        .eq('id', restaurantId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Supabase error fetching restaurant:', error);
        setConnectionError(true);
        throw new Error(`Restaurant not found: ${error.message}`);
      }

      if (!data) {
        throw new Error('Restaurant not found or is inactive');
      }

      console.log('Restaurant fetched successfully:', data.name);
      setConnectionError(false);
      return data as Restaurant;
    } catch (error) {
      console.error('Error in fetchRestaurant:', error);
      setConnectionError(true);
      throw error;
    }
  };

  const { data: menuItems = [], isLoading: menuItemsLoading, error: menuItemsError, refetch: refetchMenuItems } = useQuery({
    queryKey: ['menuItems', restaurantId],
    queryFn: fetchMenuItems,
    enabled: !!restaurantId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { data: restaurant, isLoading: restaurantLoading, error: restaurantError, refetch: refetchRestaurant } = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: fetchRestaurant,
    enabled: !!restaurantId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Connection error recovery
  useEffect(() => {
    if (connectionError) {
      const recoveryTimer = setTimeout(() => {
        console.log('Attempting to recover connection...');
        refetchRestaurant();
        refetchMenuItems();
      }, 5000);

      return () => clearTimeout(recoveryTimer);
    }
  }, [connectionError, refetchRestaurant, refetchMenuItems]);

  const addToCart = (item: MenuItem) => {
    if (!session || !isMainDevice) {
      toast({
        title: "Not Authorized",
        description: "Only the main device can place orders. Transfer control to order.",
        variant: "destructive",
      });
      setShowTransferModal(true);
      return;
    }

    console.log('Adding to cart:', item.name);
    const newCart = cart.find((cartItem) => cartItem.id === item.id)
      ? cart.map((cartItem) =>
          cartItem.id === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 } 
            : cartItem
        )
      : [...cart, { ...item, quantity: 1 }];
    
    setCart(newCart);
    
    // Update order data in the session
    if (updateOrderData) {
      updateOrderData(newCart);
    }
    
    toast({
      title: "Added to Cart",
      description: `${item.name} has been added to your cart.`,
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    const newCart = quantity === 0
      ? cart.filter((item) => item.id !== itemId)
      : cart.map((item) => 
          item.id === itemId ? { ...item, quantity } : item
        );
    
    setCart(newCart);
    
    // Update order data in the session
    if (updateOrderData) {
      updateOrderData(newCart);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description?.toLowerCase()?.includes(searchTerm.toLowerCase()))
  );

  const popularItems = menuItems.slice(0, 3);

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId || !tableNumber) {
        throw new Error('Missing restaurant or table information');
      }

      console.log('Placing order...');
      
      const orderData = {
        restaurant_id: restaurantId,
        table_number: tableNumber,
        total_amount: cartTotal,
        status: 'pending',
        notes: `Order from Table ${tableNumber}`,
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .maybeSingle();

      if (orderError || !order) {
        console.error('Error creating order:', orderError);
        throw new Error(`Failed to create order: ${orderError?.message || 'Order creation failed'}`);
      }

      // Add order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        throw new Error(`Failed to create order items: ${itemsError.message}`);
      }

      return order;
    },
    onSuccess: () => {
      toast({
        title: "Order Placed Successfully!",
        description: "Your order has been sent to the kitchen.",
      });
      setCart([]);
      setShowCart(false);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      console.error('Error placing order:', error);
      toast({
        title: "Order Failed",
        description: error instanceof Error ? error.message : "Failed to place order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateBill = () => {
    toast({
      title: "Bill Generated",
      description: `Total amount: ₹${cartTotal.toFixed(2)}`,
    });
    setShowBillDialog(false);
    navigate('/');
  };

  // Early return for missing params
  if (!restaurantId || !tableNumber) {
    return null;
  }

  // Loading state
  if (restaurantLoading || menuItemsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading menu...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we fetch your restaurant's menu</p>
        </div>
      </div>
    );
  }

  // Error state with retry option
  if (restaurantError || menuItemsError || connectionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="text-center py-8 px-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold text-red-600 mb-2">Connection Error</h3>
            <p className="text-gray-600 mb-4 text-sm">
              {restaurantError?.message || menuItemsError?.message || 
               "Unable to load the menu. Please check your connection and try again."}
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => {
                  refetchRestaurant();
                  refetchMenuItems();
                }}
                className="bg-orange-500 hover:bg-orange-600 w-full"
              >
                Try Again
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full"
              >
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <MobileMenuHeader 
        restaurant={restaurant}
        tableNumber={tableNumber}
        cartTotal={cartTotal}
        cartItemCount={cartItemCount}
        onCartClick={() => setShowCart(true)}
        sessionTimeLeft={sessionTimeLeft}
      />

      <div className="px-4 pb-4 space-y-2">
        {session && (
          <>
            <OrderHistory 
              restaurantId={restaurantId}
              tableNumber={tableNumber}
              sessionStartTime={session.startTime}
            />
            <OrderDetailsModal 
              restaurantId={restaurantId}
              tableNumber={tableNumber}
            />
          </>
        )}
      </div>

      <MobileMenuSearch 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        menuItemsCount={menuItems.length}
      />

      <MobileMenuGrid 
        popularItems={popularItems}
        filteredItems={filteredItems}
        onAddToCart={addToCart}
        isLoading={menuItemsLoading}
        searchTerm={searchTerm}
      />

      <MobileCartModal 
        open={showCart}
        onOpenChange={setShowCart}
        cart={cart}
        cartTotal={cartTotal}
        onUpdateQuantity={updateQuantity}
        onPlaceOrder={() => placeOrderMutation.mutate()}
        onGenerateBill={() => setShowBillDialog(true)}
        isPlacingOrder={placeOrderMutation.isPending}
      />

      <OrderStatusTracker 
        restaurantId={restaurantId!}
        tableNumber={tableNumber!}
      />

      <DeviceTransferModal
        open={showTransferModal}
        onOpenChange={setShowTransferModal}
        onConfirmTransfer={takeOverSession}
        tableNumber={tableNumber || ''}
        currentMainDeviceIp={session?.deviceIp || ''}
        currentDeviceIp={deviceIp}
        orderData={session?.orderData || []}
      />

      <AlertDialog open={showBillDialog} onOpenChange={setShowBillDialog}>
        <AlertDialogContent className="max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Bill & End Session</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will generate your final bill and end your dining session. 
              Total amount: ₹{cartTotal.toFixed(2)}
              
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={generateBill}
              className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto"
            >
              Generate Bill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerMenu;
