const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// GET ALL REVIEWS FOR A WORKER
router.get('/:worker_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('worker_id', req.params.worker_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST A REVIEW
router.post('/', async (req, res) => {
  const { worker_id, reviewer_name, rating, comment } = req.body;

  if (!worker_id || !rating) {
    return res.status(400).json({ error: 'Worker ID and rating are required' });
  }

  try {
    const { data, error } = await supabase
      .from('reviews')
      .insert([{ worker_id, reviewer_name, rating, comment }])
      .select()
      .single();

    if (error) throw error;

    // Update worker average rating automatically
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('worker_id', worker_id);

    if (allReviews && allReviews.length > 0) {
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await supabase
        .from('workers')
        .update({
          avg_rating: parseFloat(avg.toFixed(1)),
          review_count: allReviews.length
        })
        .eq('id', worker_id);
    }

    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE A REVIEW
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;