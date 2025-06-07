const express = require('express');
const cors = require('cors');
const path = require('path');
const { customAlphabet } = require('nanoid');
const app = express();
const PORT = 10000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);

// Danh sách 100 link đích thật
const realLinks = Array.from({ length: 100 }, (_, i) => `https://your-landing-page.com/item-${i + 1}`);

// Map từ shortId → link thật
const idToRealLink = new Map();

// Chống bot quét link
function isSuspicious(req) {
  const ua = req.headers['user-agent'] || '';
  const accept = req.headers['accept'] || '';
  const secFetch = req.headers['sec-fetch-site'] || '';
  const secUa = req.headers['sec-ch-ua'] || '';

  if (/bot|crawler|spider|facebook|curl|python|wget|node|axios/i.test(ua)) return true;
  if (!accept || accept === '*/*') return true;
  if (!secFetch && !secUa) return true;
  return false;
}

// Tạo 10 link ngắn kiểu Facebook cho mỗi comment
app.post('/api/generate-links', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Thiếu URL Facebook' });

  try {
    const parsed = new URL(url);
    const commentId = parsed.searchParams.get('comment_id');
    const pathname = parsed.pathname || '';
    const pagePath = pathname.startsWith('/') ? pathname.slice(1) : pathname; // ví dụ: nhungbannhacnghelanghien/posts/xxx

    if (!commentId || !pagePath.includes('/posts/')) {
      return res.status(400).json({ error: 'URL không hợp lệ hoặc thiếu comment_id hoặc posts' });
    }

    const links = [];

    for (let i = 0; i < 10; i++) {
      const shortId = `${commentId}_${i}`;
      const finalPath = `${pagePath}_${i}`; // như Facebook dạng: .../posts/pfbid0abcxyz
      idToRealLink.set(shortId, realLinks[Math.floor(Math.random() * realLinks.length)]);
      links.push(`http://localhost:${PORT}/${pagePath}_${i}`);
    }

    return res.json({ links });
  } catch (err) {
    return res.status(400).json({ error: 'URL không hợp lệ' });
  }
});

// Route giống Facebook: /<page>/posts/<id>
app.get('/:page/posts/:id', (req, res) => {
  if (isSuspicious(req)) {
    console.log('🛑 Bot bị chặn:', req.headers['user-agent']);
    return res.status(404).send('<h1>Không tìm thấy</h1>');
  }

  const { id } = req.params;
  const shortId = id.replace(/[^\d_]/g, ''); // Trích commentId_index từ id

  const realUrl = idToRealLink.get(shortId);
  if (!realUrl) return res.status(404).send('Link không tồn tại');

  return res.redirect(realUrl);
});

app.listen(PORT, () => {
  console.log(`✅ Server đang chạy: http://localhost:${PORT}`);
});
