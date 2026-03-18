const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ── ADMIN KEY MIDDLEWARE ───────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ── GET ALL WORKERS ───────────────────────────────────────────────────────────
// Public: returns only verified workers
// Admin (X-Admin-Key header present & valid): returns ALL workers including unverified
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;

    let query = supabase
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false });

    // Public only sees verified workers
    if (!isAdmin) {
      query = query.eq('verified', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Get workers error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET SINGLE WORKER ─────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  // Skip if the path is 'verify' — that's handled by the PATCH route below
  if (req.params.id === 'verify') return next();

  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Worker not found' });
    res.json(data);
  } catch (err) {
    console.error('Get single worker error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── CREATE WORKER PROFILE ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { user_id, name, category, category_label, district, bio, skills, price, whatsapp } = req.body;

  if (!user_id || !name || !category) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  // Check for existing profile
  try {
    const { data: existing } = await supabase
      .from('workers')
      .select('id')
      .eq('user_id', user_id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'You already have a worker profile. Please update it instead.' });
    }
  } catch (_) {}

  try {
    const { data, error } = await supabase
      .from('workers')
      .insert([{
        user_id,
        name,
        category,
        category_label: category_label || null,
        district,
        bio:          bio      || null,
        skills:       Array.isArray(skills) ? skills : [],
        price:        price    || null,
        whatsapp:     whatsapp || null,
        photo:        req.body.photo || null,
        verified:     false,          // Always starts unverified
        avg_rating:   0,
        review_count: 0,
        availability: req.body.availability || 'available',
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Create worker error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── UPDATE WORKER PROFILE ─────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { name, category, category_label, district, bio, skills, price, whatsapp } = req.body;

  try {
    const { data, error } = await supabase
      .from('workers')
      .update({
        name,
        category,
        category_label: category_label || null,
        district,
        bio:          bio      || null,
        skills:       Array.isArray(skills) ? skills : [],
        price:        price    || null,
        whatsapp:     whatsapp || null,
        photo:        req.body.photo || null,
        availability: req.body.availability || 'available',
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Update worker error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── VERIFY / UNVERIFY WORKER (admin only) ─────────────────────────────────────
router.patch('/verify/:id', requireAdmin, async (req, res) => {
  const { verified } = req.body;

  if (typeof verified !== 'boolean') {
    return res.status(400).json({ error: 'verified must be true or false' });
  }

  try {
    const { data, error } = await supabase
      .from('workers')
      .update({ verified })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Worker not found' });
    res.json(data);
  } catch (err) {
    console.error('Verify worker error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE WORKER PROFILE ─────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Worker profile deleted' });
  } catch (err) {
    console.error('Delete worker error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;