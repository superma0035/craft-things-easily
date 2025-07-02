
import { supabase } from '@/integrations/supabase/client';
import { AuthResult, Profile } from '@/types/auth';

class AuthService {
  async fetchProfile(userId: string): Promise<Profile | null> {
    try {
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      console.log('Profile fetched:', data);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }

  async signUp(email: string, password: string, fullName: string, username: string): Promise<AuthResult> {
    try {
      console.log('Starting signup process...');
      
      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (existingUser) {
        return { error: { message: 'Username already exists. Please choose a different username.' } };
      }

      const currentDomain = window.location.origin;
      const redirectUrl = `${currentDomain}/auth?message=welcome&email=${encodeURIComponent(email)}`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            username: username
          }
        }
      });
      
      if (error) {
        console.error('Signup error:', error);
        return { error: { message: error.message } };
      }
      
      console.log('Signup successful');
      return { error: null };
    } catch (error: any) {
      console.error('Signup error:', error);
      return { error: { message: error.message || 'An error occurred during signup' } };
    }
  }

  async signIn(identifier: string, password: string): Promise<AuthResult> {
    try {
      console.log('Attempting sign in with identifier:', identifier);
      
      // Always try email login first (whether it's email or username)
      let loginEmail = identifier;
      
      // If identifier doesn't contain @, try to find email by username
      if (!identifier.includes('@')) {
        console.log('Identifier appears to be username, looking up email...');
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', identifier)
            .maybeSingle();
            
          if (profileError) {
            console.error('Profile lookup error:', profileError);
            return { error: { message: 'Invalid username or password' } };
          }
          
          if (!profileData?.email) {
            console.log('No profile found for username:', identifier);
            return { error: { message: 'Invalid username or password' } };
          }
          
          loginEmail = profileData.email;
          console.log('Found email for username:', loginEmail);
        } catch (usernameError) {
          console.error('Username lookup error:', usernameError);
          return { error: { message: 'Invalid username or password' } };
        }
      }

      // Attempt login with the email
      console.log('Attempting login with email:', loginEmail);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password
      });
      
      if (error) {
        console.error('Login error:', error);
        // Provide user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          return { error: { message: 'Invalid email/username or password' } };
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: { message: 'Please check your email and click the confirmation link before signing in' } };
        }
        return { error: { message: error.message } };
      }

      if (data.user) {
        console.log('Login successful for user:', data.user.id);
        return { error: null };
      }

      return { error: { message: 'Login failed - no user data returned' } };
      
    } catch (error: any) {
      console.error('Signin error:', error);
      return { error: { message: error.message || 'An error occurred during signin' } };
    }
  }

  async resetPassword(email: string): Promise<AuthResult> {
    try {
      const currentDomain = window.location.origin;
      const redirectUrl = `${currentDomain}/auth?message=reset`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      
      if (error) {
        return { error: { message: error.message } };
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Reset password error:', error);
      return { error: { message: error.message || 'An error occurred during password reset' } };
    }
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    window.location.href = '/';
  }
}

// Export a single instance to maintain consistent context
export const authService = new AuthService();
