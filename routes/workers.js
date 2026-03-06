const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// GET ALL WORKERS
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Get workers error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET SINGLE WORKER
router.get('/:id', async (req, res) => {
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

// CREATE WORKER PROFILE
router.post('/', async (req, res) => {
  const {
    user_id,
    name,
    category,
    category_label,
    district,
    bio,
    skills,
    price,
    whatsapp,
  } = req.body;

  if (!user_id || !name || !category || !district) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  // prevent duplicate profiles for same user
  try {
    const { data: existing } = await supabase
      .from('workers')
      .select('id')
      .eq('user_id', user_id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'You already have a worker profile. Please update it instead.' });
    }
  } catch (_) {
    // no existing profile found — safe to continue
  }

  try {
    const { data, error } = await supabase
      .from('workers')
      .insert([{
        user_id,
        name,
        category,
        category_label: category_label || null,
        district,
        bio:      bio      || null,
        skills:   Array.isArray(skills) ? skills : [],  // ensure array
        price:    price    || null,
        whatsapp: whatsapp || null,
        verified: false,              // always starts unverified
        avg_rating:   0,
        review_count: 0,
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

// UPDATE WORKER PROFILE
router.put('/:id', async (req, res) => {
  const {
    name,
    category,
    category_label,
    district,
    bio,
    skills,
    price,
    whatsapp,
  } = req.body;

  try {
    const { data, error } = await supabase
      .from('workers')
      .update({
        name,
        category,
        category_label: category_label || null,
        district,
        bio:      bio      || null,
        skills:   Array.isArray(skills) ? skills : [],
        price:    price    || null,
        whatsapp: whatsapp || null,
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

// DELETE WORKER PROFILE
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