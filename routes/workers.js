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
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Worker not found' });
  }
});

// CREATE WORKER PROFILE
router.post('/', async (req, res) => {
  const { user_id, name, category, category_label, district, bio, skills, price, whatsapp } = req.body;

  if (!user_id || !name || !category || !district) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  try {
    const { data, error } = await supabase
      .from('workers')
      .insert([{ user_id, name, category, category_label, district, bio, skills, price, whatsapp }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE WORKER PROFILE
router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
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
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;