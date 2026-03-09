const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  "https://mhldpzkgwolbrdtmbixw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obGRwemtnd29sYnJkdG1iaXh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ4NjE4NiwiZXhwIjoyMDg4MDYyMTg2fQ.JbEtr2yX8qZjCYsZa02TMTNAXvFyoO5vcH0h_L-Sabs"
);

// GET ALL APPLICATIONS FOR A JOB
router.get('/job/:job_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('job_id', req.params.job_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Get applications error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET ALL APPLICATIONS BY A WORKER
router.get('/worker/:user_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', req.params.user_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Get worker applications error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// SUBMIT AN APPLICATION
router.post('/', async (req, res) => {
  const { job_id, worker_id, user_id, worker_name, worker_category, worker_district, worker_whatsapp, message } = req.body;

  if (!job_id || !user_id) {
    return res.status(400).json({ error: 'Job ID and user ID are required' });
  }

  try {
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', job_id)
      .eq('user_id', user_id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'You have already applied for this job' });
    }

    const { data, error } = await supabase
      .from('applications')
      .insert([{
        job_id,
        worker_id:       worker_id       || null,
        user_id,
        worker_name:     worker_name     || null,
        worker_category: worker_category || null,
        worker_district: worker_district || null,
        worker_whatsapp: worker_whatsapp || null,
        message:         message         || null,
        status:          'pending',
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Submit application error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE APPLICATION STATUS
router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  try {
    const { data, error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Update application error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE APPLICATION
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Application withdrawn' });
  } catch (err) {
    console.error('Delete application error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;