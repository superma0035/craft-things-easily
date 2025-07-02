
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurants } from '@/hooks/useRestaurants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, Building, Lock, Mail, AlertTriangle, Trash2, CreditCard, Shield } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import ContactSupportModal from '@/components/ContactSupportModal';
import { useSubscription } from '@/hooks/useSubscription';

const Settings = () => {
  const { profile, user, refreshProfile } = useAuth();
  const { data: restaurants, refetch: refetchRestaurants } = useRestaurants();
  const { subscriptionStatus, isLoading: subscriptionLoading, createCheckoutSession, openCustomerPortal, refreshSubscriptionStatus } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');

  // Profile form states
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');

  // Restaurant form states
  const [restaurantName, setRestaurantName] = useState(restaurants?.[0]?.name || '');
  const [restaurantDescription, setRestaurantDescription] = useState(restaurants?.[0]?.description || '');
  const [restaurantAddress, setRestaurantAddress] = useState(restaurants?.[0]?.address || '');
  const [restaurantPhone, setRestaurantPhone] = useState(restaurants?.[0]?.phone || '');

  // Password form states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          username: username,
        })
        .eq('id', user?.id);

      if (error) throw error;

      await refreshProfile();
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const restaurant = restaurants?.[0];
      if (!restaurant) {
        toast({
          title: "No Restaurant Found",
          description: "Please create a restaurant first.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('restaurants')
        .update({
          name: restaurantName,
          description: restaurantDescription,
          address: restaurantAddress,
          phone: restaurantPhone,
        })
        .eq('id', restaurant.id);

      if (error) throw error;

      await refetchRestaurants();
      toast({
        title: "Restaurant Updated",
        description: "Your restaurant information has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      
      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Password Change Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (!confirm("Are you sure you want to deactivate your account? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    
    try {
      // In a production app, you'd want to call a backend function to properly deactivate
      // For now, we'll just sign the user out
      await supabase.auth.signOut();
      
      toast({
        title: "Account Deactivated",
        description: "Your account has been deactivated. You've been signed out.",
      });
    } catch (error: any) {
      toast({
        title: "Deactivation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderProfileSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Profile Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              value={profile?.email || ''}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500">Email cannot be changed</p>
          </div>
          <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600">
            {loading ? 'Updating...' : 'Update Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  const renderRestaurantSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5" />
          Restaurant Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        {restaurants?.[0] ? (
          <form onSubmit={handleUpdateRestaurant} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="restaurantName">Restaurant Name</Label>
              <Input
                id="restaurantName"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="Enter restaurant name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restaurantDescription">Description</Label>
              <Input
                id="restaurantDescription"
                value={restaurantDescription}
                onChange={(e) => setRestaurantDescription(e.target.value)}
                placeholder="Brief description of your restaurant"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restaurantAddress">Address</Label>
              <Input
                id="restaurantAddress"
                value={restaurantAddress}
                onChange={(e) => setRestaurantAddress(e.target.value)}
                placeholder="Restaurant address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restaurantPhone">Phone Number</Label>
              <Input
                id="restaurantPhone"
                value={restaurantPhone}
                onChange={(e) => setRestaurantPhone(e.target.value)}
                placeholder="Restaurant phone number"
              />
            </div>
            <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600">
              {loading ? 'Updating...' : 'Update Restaurant'}
            </Button>
          </form>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No restaurant found. Please create a restaurant first from the dashboard.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderPasswordSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Change Password
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={6}
            />
          </div>
          <p className="text-xs text-gray-500">Password must be at least 6 characters long</p>
          <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600">
            {loading ? 'Changing...' : 'Change Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  const renderSubscriptionSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Subscription & Billing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {subscriptionLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading subscription status...</p>
          </div>
        ) : (
          <>
            {/* Current Subscription Status */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    {subscriptionStatus?.subscribed ? 'Premium Plan' : 'Free Plan'}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {subscriptionStatus?.subscribed 
                      ? `${subscriptionStatus.subscription_tier} subscription` 
                      : 'Upgrade to unlock premium features'
                    }
                  </p>
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    subscriptionStatus?.subscribed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {subscriptionStatus?.subscribed ? 'Active' : 'Free'}
                  </div>
                  {subscriptionStatus?.subscription_end && (
                    <p className="text-xs text-gray-500 mt-1">
                      Renews {new Date(subscriptionStatus.subscription_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {subscriptionStatus?.subscribed ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Shield className="w-4 h-4" />
                    <span>Premium features enabled</span>
                  </div>
                  <Button
                    onClick={() => openCustomerPortal()}
                    disabled={subscriptionLoading}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    Manage Subscription
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    <p>Upgrade to Premium and unlock:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Unlimited menu items</li>
                      <li>Advanced analytics</li>
                      <li>Custom branding</li>
                      <li>Priority support</li>
                    </ul>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => createCheckoutSession({ mode: 'subscription' })}
                      disabled={subscriptionLoading}
                      className="bg-amber-500 hover:bg-amber-600"
                    >
                      {subscriptionLoading ? 'Processing...' : 'Upgrade to Premium'}
                    </Button>
                    <Button
                      onClick={() => refreshSubscriptionStatus()}
                      disabled={subscriptionLoading}
                      variant="outline"
                    >
                      Refresh Status
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Billing History */}
            <div className="border-t pt-6">
              <h4 className="font-medium mb-3">Billing & Invoices</h4>
              <p className="text-gray-600 text-sm mb-4">
                Manage your billing information and view payment history through our secure customer portal.
              </p>
              <Button
                onClick={() => openCustomerPortal()}
                disabled={subscriptionLoading}
                variant="outline"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                View Billing Portal
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  const renderContactSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Support & Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-medium mb-2">Contact Support</h3>
          <p className="text-gray-600 text-sm mb-4">
            Need help with ZapDine? Our support team is here to assist you.
          </p>
          <ContactSupportModal />
        </div>
        
        <div className="border-t pt-6">
          <h3 className="font-medium mb-2 text-red-600">Danger Zone</h3>
          <p className="text-gray-600 text-sm mb-4">
            Permanently deactivate your account. This action cannot be undone.
          </p>
          <Button
            onClick={handleDeactivateAccount}
            disabled={loading}
            variant="destructive"
            className="bg-red-500 hover:bg-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Deactivate Account
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="flex h-screen">
        <Sidebar activeTab="settings" onTabChange={() => {}} />
        
        <div className="flex-1 md:pl-64">
          <main className="p-6 overflow-auto h-full">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600 mt-2">Manage your account and restaurant settings</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Settings Navigation */}
                <div className="lg:col-span-1">
                  <Card>
                    <CardContent className="p-4">
                      <nav className="space-y-2">
                        <button
                          onClick={() => setActiveSection('profile')}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeSection === 'profile' 
                              ? 'bg-amber-500 text-white' 
                              : 'text-gray-700 hover:bg-amber-50'
                          }`}
                        >
                          Profile
                        </button>
                        <button
                          onClick={() => setActiveSection('restaurant')}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeSection === 'restaurant' 
                              ? 'bg-amber-500 text-white' 
                              : 'text-gray-700 hover:bg-amber-50'
                          }`}
                        >
                          Restaurant
                        </button>
                        <button
                          onClick={() => setActiveSection('password')}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeSection === 'password' 
                              ? 'bg-amber-500 text-white' 
                              : 'text-gray-700 hover:bg-amber-50'
                          }`}
                        >
                          Password
                        </button>
                         <button
                           onClick={() => setActiveSection('subscription')}
                           className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                             activeSection === 'subscription' 
                               ? 'bg-amber-500 text-white' 
                               : 'text-gray-700 hover:bg-amber-50'
                           }`}
                         >
                           Subscription
                         </button>
                         <button
                           onClick={() => setActiveSection('support')}
                           className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                             activeSection === 'support' 
                               ? 'bg-amber-500 text-white' 
                               : 'text-gray-700 hover:bg-amber-50'
                           }`}
                         >
                           Support
                         </button>
                      </nav>
                    </CardContent>
                  </Card>
                </div>

                 {/* Settings Content */}
                 <div className="lg:col-span-3">
                   {activeSection === 'profile' && renderProfileSection()}
                   {activeSection === 'restaurant' && renderRestaurantSection()}
                   {activeSection === 'password' && renderPasswordSection()}
                   {activeSection === 'subscription' && renderSubscriptionSection()}
                   {activeSection === 'support' && renderContactSection()}
                 </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Settings;
