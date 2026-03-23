const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  "https://mhldpzkgwolbrdtmbixw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obGRwemtnd29sYnJkdG1iaXh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ4NjE4NiwiZXhwIjoyMDg4MDYyMTg2fQ.JbEtr2yX8qZjCYsZa02TMTNAXvFyoO5vcH0h_L-Sabs"
);

const ADMIN_KEY = "Wat20052006$$..";

// GET ALL JOBS
// Public: approved only | Admin: all including pending_approval
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.headers['x-admin-key'] === ADMIN_KEY;

    let query = supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.neq('status', 'pending_approval');
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Get jobs error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET SINGLE JOB
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Job not found' });
    res.json(data);
  } catch (err) {
    console.error('Get single job error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST A JOB — always starts as pending_approval
router.post('/', async (req, res) => {
  const {
    user_id, client_name, title, category, category_label,
    district, budget, description, requirements, phone, email, status,
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
        title,
        category:       category       || null,
        category_label: category_label || null,
        district:       district       || null,
        budget:         budget         || null,
        description,
        requirements:   requirements   || null,
        phone:          phone          || null,
        email:          email          || null,
        status:         status         || 'pending_approval',
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

// PATCH JOB STATUS
// Admin: can approve (pending_approval -> open)
// Job owner: can update (open -> inprogress -> filled)
router.patch('/:id', async (req, res) => {
  const { status } = req.body;

  const VALID_STATUSES = ['pending_approval', 'open', 'inprogress', 'filled'];
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  // Only admin can move a job from pending_approval to open
  if (status === 'open') {
    const isAdmin = req.headers['x-admin-key'] === ADMIN_KEY;
    if (!isAdmin) {
      const { data: existing } = await supabase
        .from('jobs')
        .select('status')
        .eq('id', req.params.id)
        .single();

      if (existing && existing.status === 'pending_approval') {
        return res.status(403).json({ error: 'Only admins can approve pending jobs' });
      }
    }
  }

  try {
    const { data, error } = await supabase
      .from('jobs')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Job not found' });
    res.json(data);
  } catch (err) {
    console.error('Update job status error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE A JOB
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    console.error('Delete job error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;