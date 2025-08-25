import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

interface AuthRequest {
  action: 'signup' | 'signin' | 'validate_session';
  email?: string;
  password?: string;
  fullName?: string;
  username?: string;
  sessionToken?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: AuthRequest = await req.json();
    console.log('Auth request:', { action: body.action, email: body.email });

    switch (body.action) {
      case 'signup':
        return await handleSignup(supabase, body);
      case 'signin':
        return await handleSignin(supabase, body);
      case 'validate_session':
        return await handleValidateSession(supabase, body);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Auth function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleSignup(supabase: any, body: AuthRequest) {
  const { email, password, fullName, username } = body;

  if (!email || !password || !fullName || !username) {
    return new Response(
      JSON.stringify({ error: 'All fields are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'Username already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for development
      user_metadata: {
        full_name: fullName,
        username: username
      }
    });

    if (error) {
      console.error('Signup error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log security event
    await supabase.rpc('log_security_event', {
      event_type: 'user_signup',
      table_name: 'auth_users',
      record_id: data.user?.id,
      event_data: { email, username }
    });

    return new Response(
      JSON.stringify({ success: true, user: data.user }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Signup function error:', error);
    return new Response(
      JSON.stringify({ error: 'Signup failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleSignin(supabase: any, body: AuthRequest) {
  const { email, password } = body;

  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: 'Email and password are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Log login attempt
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await supabase
      .from('login_attempts')
      .insert({
        email,
        ip_address: clientIp,
        user_agent: userAgent,
        success: false
      });

    // If email doesn't contain @, try to find email by username
    let loginEmail = email;
    if (!email.includes('@')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', email)
        .maybeSingle();

      if (!profile?.email) {
        return new Response(
          JSON.stringify({ error: 'Invalid username or password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      loginEmail = profile.email;
    }

    // Attempt sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password
    });

    if (error) {
      console.error('Signin error:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log successful login
    await supabase
      .from('login_attempts')
      .insert({
        email: loginEmail,
        ip_address: clientIp,
        user_agent: userAgent,
        success: true
      });

    // Log security event
    await supabase.rpc('log_security_event', {
      event_type: 'user_signin',
      table_name: 'auth_users',
      record_id: data.user?.id,
      event_data: { email: loginEmail, ip: clientIp }
    });

    return new Response(
      JSON.stringify({ success: true, user: data.user, session: data.session }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Signin function error:', error);
    return new Response(
      JSON.stringify({ error: 'Signin failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleValidateSession(supabase: any, body: AuthRequest) {
  const { sessionToken } = body;

  if (!sessionToken) {
    return new Response(
      JSON.stringify({ error: 'Session token is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validate session token
    const { data: session } = await supabase
      .from('device_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last activity
    await supabase
      .from('device_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('session_token', sessionToken);

    return new Response(
      JSON.stringify({ valid: true, session }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Validate session function error:', error);
    return new Response(
      JSON.stringify({ error: 'Validation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}