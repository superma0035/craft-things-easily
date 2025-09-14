
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
      
      // Validate required fields
      if (!email || !password || !fullName || !username) {
        return { error: { message: 'All fields are required for signup' } };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { error: { message: 'Please enter a valid email address' } };
      }

      // Validate password strength
      if (password.length < 6) {
        return { error: { message: 'Password must be at least 6 characters long' } };
      }

      // Skip pre-check of username to avoid RLS issues; rely on server-side validation if needed

      const currentDomain = window.location.origin;
      const redirectUrl = `${currentDomain}/auth?message=welcome&email=${encodeURIComponent(email)}`;
      
      const { data, error } = await supabase.auth.signUp({
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
        // Provide more specific error messages
        if (error.message.includes('User already registered')) {
          return { error: { message: 'An account with this email already exists. Please try logging in instead.' } };
        }
        if (error.message.includes('Password should be')) {
          return { error: { message: 'Password does not meet security requirements. Please use at least 6 characters.' } };
        }
        if (error.message.includes('Invalid email')) {
          return { error: { message: 'Please enter a valid email address.' } };
        }
        return { error: { message: error.message } };
      }

      // Check if user was created but needs email confirmation
      if (data.user && !data.session) {
        console.log('Signup successful - email confirmation required');
        return { error: null };
      }
      
      console.log('Signup successful');
      return { error: null };
    } catch (error: any) {
      console.error('Unexpected signup error:', error);
      return { error: { message: error.message || 'An unexpected error occurred during signup. Please try again.' } };
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
