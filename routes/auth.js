const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  "https://mhldpzkgwolbrdtmbixw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obGRwemtnd29sYnJkdG1iaXh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ4NjE4NiwiZXhwIjoyMDg4MDYyMTg2fQ.JbEtr2yX8qZjCYsZa02TMTNAXvFyoO5vcH0h_L-Sabs"
);

const JWT_SECRET = "findworks2025secret";

// REGISTER
router.post('/register', async (req, res) => {
  const { name, email, password, role, district, phone } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert([{
        name,
        email,
        password: hashedPassword,
        role,
        district: district || null,
        phone:    phone    || null,
      }])
      .select()
      .single();

    if (error) throw error;

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
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
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

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

    const { error } = await supabase.from('users').delete().eq('id', id);

    if (error) throw error;

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;