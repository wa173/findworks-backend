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
    console.error('Get reviews error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST A REVIEW
router.post('/', async (req, res) => {
  const { worker_id, reviewer_id, reviewer_name, rating, comment } = req.body;

  if (!worker_id || !rating) {
    return res.status(400).json({ error: 'Worker ID and rating are required' });
  }

  try {
    const { data, error } = await supabase
      .from('reviews')
      .insert([{
        worker_id,
        reviewer_id:   reviewer_id   || null,  // ← now saved
        reviewer_name: reviewer_name || null,   // ← fixed column name (was revier_name typo in DB — make sure you renamed it)
        rating:        parseInt(rating),
        comment:       comment       || null,
      }])
      .select()
      .single();

    if (error) throw error;

    // Recalculate worker avg rating and review count
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('worker_id', worker_id);

    if (allReviews && allReviews.length > 0) {
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await supabase
        .from('workers')
        .update({
          avg_rating:   parseFloat(avg.toFixed(1)),
          review_count: allReviews.length,
        })
        .eq('id', worker_id);
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Post review error:', err.message);
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

    // After deleting, recalculate avg rating for that worker
    const { id } = req.params;
    const { data: review } = await supabase
      .from('reviews')
      .select('worker_id')
      .eq('id', id)
      .single();

    if (review) {
      const { data: remaining } = await supabase
        .from('reviews')
        .select('rating')
        .eq('worker_id', review.worker_id);

      const avg = remaining && remaining.length > 0
        ? remaining.reduce((sum, r) => sum + r.rating, 0) / remaining.length
        : 0;

      await supabase
        .from('workers')
        .update({
          avg_rating:   parseFloat(avg.toFixed(1)),
          review_count: remaining ? remaining.length : 0,
        })
        .eq('id', review.worker_id);
    }

    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error('Delete review error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;