const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Dữ liệu thật (demo 100 link)
const realLinks = Array.from({ length: 100 }, (_, i) => `https://your-landing-page.com/item-${i + 1}`);

// Gán link theo comment ID
const assignedLinks = new Map();

function assignLinksForComment(commentId, number = 10) {
  if (!assignedLinks.has(commentId)) {
    const chosen = new Set();
    while (chosen.size < number) {
      const idx = Math.floor(Math.random() * realLinks.length);
      chosen.add(idx);
    }
    assignedLinks.set(commentId, chosen);
  }
  return [...assignedLinks.get(commentId)];
}

function isBot(ua) {
  return /bot|facebook|crawler|spider/i.test(ua);
}

// API tạo link từ comment
// API tạo link từ URL Facebook chứa comment_id
app.post('/api/generate-links', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Thiếu URL Facebook' });

  try {
    const parsed = new URL(url);
    const commentId = parsed.searchParams.get('comment_id');

    if (!commentId) {
      return res.status(400).json({ error: 'URL không hợp lệ hoặc thiếu comment_id' });
    }

    const indexes = assignLinksForComment(commentId);
    const shortLinks = indexes.map(i => {
      const shortId = `l${commentId}_${i}`;
      return `http://localhost:${PORT}/l/${shortId}`;
    });

    res.json({ links: shortLinks });
  } catch (err) {
    return res.status(400).json({ error: 'URL không hợp lệ' });
  }
});


// Route redirect
app.get('/l/:id', (req, res) => {
  const ua = req.headers['user-agent'] || '';
  if (isBot(ua)) return res.status(404).send('Not found');

  const id = req.params.id;
  const match = id.match(/^l(\\d+)_([0-9]+)$/);
  if (!match) return res.status(400).send('Invalid link');

  const [_, commentId, linkIndexStr] = match;
  const linkIndex = parseInt(linkIndexStr);
  const assigned = assignedLinks.get(commentId);

  if (!assigned || !assigned.has(linkIndex)) {
    return res.status(404).send('Link expired or not assigned');
  }

  const realUrl = realLinks[linkIndex];
  return res.redirect(realUrl);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
