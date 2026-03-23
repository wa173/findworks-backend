const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  "https://mhldpzkgwolbrdtmbixw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obGRwemtnd29sYnJkdG1iaXh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ4NjE4NiwiZXhwIjoyMDg4MDYyMTg2fQ.JbEtr2yX8qZjCYsZa02TMTNAXvFyoO5vcH0h_L-Sabs"
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
        reviewer_id:   reviewer_id   || null,
        reviewer_name: reviewer_name || null,
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
    const { data: review } = await supabase
      .from('reviews')
      .select('worker_id')
      .eq('id', req.params.id)
      .single();

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    // Recalculate avg rating after deletion
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