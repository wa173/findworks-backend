const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Service role client for admin operations
const supabase = createClient(
  "https://mhldpzkgwolbrdtmbixw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obGRwemtnd29sYnJkdG1iaXh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ4NjE4NiwiZXhwIjoyMDg4MDYyMTg2fQ.JbEtr2yX8qZjCYsZa02TMTNAXvFyoO5vcH0h_L-Sabs"
);

// Anon client for auth operations
const supabaseAnon = createClient(
  "https://mhldpzkgwolbrdtmbixw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obGRwemtnd29sYnJkdG1iaXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODYxODYsImV4cCI6MjA4ODA2MjE4Nn0.hHPp2JxZ0RYt3Zdp56yaW9cFiwitw86FUN32BuJySuI"
);

// REGISTER
router.post('/register', async (req, res) => {
  const { name, email, password, role, district, phone } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Create auth user — Supabase sends verification email automatically
    const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://findworks.netlify.app',
        data: { name, role }
      }
    });

    if (authError) throw authError;

    const authUser = authData.user;
    if (!authUser) throw new Error('Failed to create account');

    // Save extra info in our users table
    const { error: dbError } = await supabase
      .from('users')
      .insert([{
        id:       authUser.id,
        name,
        email,
        password: 'supabase_auth',
        role,
        district: district || null,
        phone:    phone    || null,
      }]);

    if (dbError) throw dbError;

    res.status(201).json({
      message: 'Account created! Please check your email to verify your account before logging in.',
      needsVerification: true,
    });

  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      if (authError.message.includes('Email not confirmed')) {
        return res.status(401).json({ error: 'Please verify your email before logging in. Check your inbox.' });
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const authUser = authData.user;
    const token = authData.session.access_token;

    // Get extra user info from our users table
    const { data: user, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (dbError || !user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json({
      message: 'Login successful',
      token,
      user: {
        id:       user.id,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        district: user.district,
        phone:    user.phone,
      }
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://findworks.netlify.app?reset=true',
    });

    if (error) throw error;

    res.json({ message: 'Password reset email sent! Check your inbox.' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  const { access_token, new_password } = req.body;

  if (!access_token || !new_password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  try {
    const { error: sessionError } = await supabaseAnon.auth.setSession({
      access_token,
      refresh_token: access_token,
    });

    if (sessionError) throw sessionError;

    const { error } = await supabaseAnon.auth.updateUser({
      password: new_password,
    });

    if (error) throw error;

    res.json({ message: 'Password reset successfully! You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Failed to reset password. Please request a new reset link.' });
  }
});

// CHANGE PASSWORD
router.post('/change-password', async (req, res) => {
  const { access_token, new_password } = req.body;

  if (!access_token || !new_password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  try {
    const { error: sessionError } = await supabaseAnon.auth.setSession({
      access_token,
      refresh_token: access_token,
    });

    if (sessionError) throw sessionError;

    const { error } = await supabaseAnon.auth.updateUser({
      password: new_password,
    });

    if (error) throw error;

    res.json({ message: 'Password changed successfully!' });
  } catch (err) {
    console.error('Change password error:', err.message);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// DELETE ACCOUNT
router.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await supabase.from('reviews').delete().eq('reviewer_id', id);

    const { data: workerProfile } = await supabase
      .from('workers')
      .select('id')
      .eq('user_id', id)
      .single();

    if (workerProfile) {
      await supabase.from('reviews').delete().eq('worker_id', workerProfile.id);
      await supabase.from('workers').delete().eq('user_id', id);
    }

    await supabase.from('jobs').delete().eq('user_id', id);
    await supabase.from('users').delete().eq('id', id);
    await supabase.auth.admin.deleteUser(id);

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;