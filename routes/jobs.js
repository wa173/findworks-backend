const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ── ADMIN KEY MIDDLEWARE ───────────────────────────────────────────────────────
// Protects admin-only operations (approve, delete by admin)
function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ── GET ALL JOBS ──────────────────────────────────────────────────────────────
// Public: returns only approved jobs (status != pending_approval)
// Admin (X-Admin-Key header): returns ALL jobs including pending
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;

    let query = supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    // Public users only see approved jobs
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

// ── GET SINGLE JOB ────────────────────────────────────────────────────────────
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

// ── POST A JOB ────────────────────────────────────────────────────────────────
// Jobs are created with status 'pending_approval' — admin must approve before going live
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
    status,
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
        // Always start as pending_approval unless admin is posting directly
        status: status || 'pending_approval',
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

// ── PATCH A JOB (status update) ───────────────────────────────────────────────
// Used by:
//   - Admin: approve (pending_approval → open), reject (delete instead)
//   - Job owner: update status (open → inprogress → filled)
router.patch('/:id', async (req, res) => {
  const { status } = req.body;

  const VALID_STATUSES = ['pending_approval', 'open', 'inprogress', 'filled'];
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  // Only admin can approve (set status to 'open' from 'pending_approval')
  if (status === 'open') {
    const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;
    if (!isAdmin) {
      // Check if the job is currently pending — if so, block
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

// ── DELETE A JOB ──────────────────────────────────────────────────────────────
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