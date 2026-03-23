const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  "https://mhldpzkgwolbrdtmbixw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obGRwemtnd29sYnJkdG1iaXh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ4NjE4NiwiZXhwIjoyMDg4MDYyMTg2fQ.JbEtr2yX8qZjCYsZa02TMTNAXvFyoO5vcH0h_L-Sabs"
);

const RESEND_API_KEY = "re_jcsqx3R9_GJXrRPVTuU2ExaaJg3DB8bSW";
const SITE_URL = "https://findworks.netlify.app";

// EMAIL HELPER
async function sendEmail({ to, subject, html }) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FindWorks Malawi <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });
    const data = await res.json();
    if (!res.ok) console.error("Resend error:", data);
    return data;
  } catch (err) {
    console.error("Email send error:", err.message);
  }
}

// EMAIL TEMPLATES
function newApplicationEmail({ clientName, clientEmail, workerName, workerCategory, workerDistrict, workerWhatsapp, jobTitle, message }) {
  return {
    to: clientEmail,
    subject: `New Application for "${jobTitle}" — FindWorks Malawi`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;">
        <div style="background:#1a7a3c;padding:20px 24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">FindWorks <span style="color:#f59e0b;">Malawi</span></h1>
        </div>
        <div style="background:#fff;padding:28px 24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
          <h2 style="color:#111827;font-size:18px;margin-top:0;">📬 New Application Received!</h2>
          <p style="color:#6b7280;font-size:14px;">Hi ${clientName || 'there'}, someone has applied for your job post.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#166534;font-weight:700;font-size:15px;">👷 ${workerName}</p>
            <p style="margin:0 0 4px;color:#374151;font-size:13px;">🛠 ${workerCategory || 'Worker'}</p>
            <p style="margin:0 0 4px;color:#374151;font-size:13px;">📍 ${workerDistrict || 'Malawi'}</p>
            ${workerWhatsapp ? `<p style="margin:0;color:#374151;font-size:13px;">📱 ${workerWhatsapp}</p>` : ''}
          </div>
          ${message ? `
          <div style="background:#f9fafb;border-left:3px solid #1a7a3c;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Their Message</p>
            <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${message}</p>
          </div>` : ''}
          <p style="color:#6b7280;font-size:13px;">Job Post: <strong style="color:#111827;">${jobTitle}</strong></p>
          ${workerWhatsapp ? `
          <a href="https://wa.me/${workerWhatsapp.replace(/\D/g, '')}?text=Hi ${encodeURIComponent(workerName)}, I saw your application on FindWorks Malawi for my job post. I am interested in discussing further."
             style="display:inline-block;background:#25D366;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-top:8px;">
            💬 Contact on WhatsApp
          </a>` : ''}
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px;">
            View all applications at <a href="${SITE_URL}" style="color:#1a7a3c;">${SITE_URL}</a><br/>
            FindWorks Malawi — Free to Use · No Commission
          </p>
        </div>
      </div>
    `
  };
}

function applicationStatusEmail({ workerEmail, workerName, jobTitle, status, clientName }) {
  const isAccepted = status === 'accepted';
  return {
    to: workerEmail,
    subject: `Your application for "${jobTitle}" has been ${status} — FindWorks Malawi`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;">
        <div style="background:#1a7a3c;padding:20px 24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">FindWorks <span style="color:#f59e0b;">Malawi</span></h1>
        </div>
        <div style="background:#fff;padding:28px 24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
          <h2 style="color:#111827;font-size:18px;margin-top:0;">
            ${isAccepted ? '🎉 Application Accepted!' : '📋 Application Update'}
          </h2>
          <p style="color:#6b7280;font-size:14px;">Hi ${workerName || 'there'},</p>
          <p style="color:#374151;font-size:14px;line-height:1.6;">
            Your application for <strong>${jobTitle}</strong> has been
            <strong style="color:${isAccepted ? '#16a34a' : '#dc2626'};">${status}</strong>
            ${clientName ? ` by ${clientName}` : ''}.
          </p>
          ${isAccepted ? `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0;color:#166534;font-size:14px;line-height:1.6;">
              ✅ Great news! The client is interested in your profile. Check your WhatsApp for any messages from them.
            </p>
          </div>` : `
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0;color:#991b1b;font-size:14px;line-height:1.6;">
              Don't give up! There are many more jobs available on FindWorks Malawi. Keep applying!
            </p>
          </div>`}
          <a href="${SITE_URL}?page=alljobs"
             style="display:inline-block;background:#1a7a3c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-top:8px;">
            Browse More Jobs →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px;">
            FindWorks Malawi — Free to Use · No Commission · <a href="${SITE_URL}" style="color:#1a7a3c;">${SITE_URL}</a>
          </p>
        </div>
      </div>
    `
  };
}

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
    // Check if already applied
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

    // Send email to client
    try {
      const { data: job } = await supabase
        .from('jobs')
        .select('title, email, client_name, user_id')
        .eq('id', job_id)
        .single();

      if (job) {
        let clientEmail = job.email;
        if (!clientEmail && job.user_id) {
          const { data: clientUser } = await supabase
            .from('users')
            .select('email')
            .eq('id', job.user_id)
            .single();
          if (clientUser) clientEmail = clientUser.email;
        }

        if (clientEmail) {
          await sendEmail(newApplicationEmail({
            clientName:     job.client_name,
            clientEmail,
            workerName:     worker_name,
            workerCategory: worker_category,
            workerDistrict: worker_district,
            workerWhatsapp: worker_whatsapp,
            jobTitle:       job.title,
            message,
          }));
        }
      }
    } catch (emailErr) {
      console.error('Client notification email error:', emailErr.message);
    }

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

    // Send email to worker
    try {
      const { data: workerUser } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', data.user_id)
        .single();

      const { data: job } = await supabase
        .from('jobs')
        .select('title, client_name')
        .eq('id', data.job_id)
        .single();

      if (workerUser?.email && job) {
        await sendEmail(applicationStatusEmail({
          workerEmail: workerUser.email,
          workerName:  workerUser.name || data.worker_name,
          jobTitle:    job.title,
          status,
          clientName:  job.client_name,
        }));
      }
    } catch (emailErr) {
      console.error('Worker notification email error:', emailErr.message);
    }

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