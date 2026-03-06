const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// GET ALL JOBS
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Get jobs error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST A JOB
router.post('/', async (req, res) => {
  const {
    user_id,
    client_name,
    title,
    category,
    category_label,
    district,
    budget,
    description,
    requirements,
    phone,
    email,
  } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  try {
    const { data, error } = await supabase
      .from('jobs')
      .insert([{
        user_id:        user_id        || null,
        client_name:    client_name    || null,
        title:          title,
        category:       category       || null,
        category_label: category_label || null,
        district:       district       || null,
        budget:         budget         || null,
        description:    description,
        requirements:   requirements   || null,
        phone:          phone          || null,
        email:          email          || null,
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Post job error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE A JOB
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    console.error('Delete job error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;