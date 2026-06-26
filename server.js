const express = require('express');
const nodemailer = require('nodemailer');
const https = require('https');
const dns = require('dns');
require('dotenv').config();

dns.setDefaultResultOrder('ipv4first');

const app = express();
app.use(express.json());
app.use(express.static('.'));

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    family: 4,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

function logToSheet(type, text) {
    return new Promise((resolve) => {
        const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
        if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com')) { resolve(); return; }
        const data = JSON.stringify({ type, text, timestamp: new Date().toISOString() });
        function doRequest(urlStr) {
            const url = new URL(urlStr);
            const options = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
            };
            const req = https.request(options, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) { doRequest(res.headers.location); return; }
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => { console.log('Sheet response:', body); resolve(); });
            });
            req.on('error', (err) => { console.error('Sheet error:', err.message); resolve(); });
            req.write(data);
            req.end();
        }
        doRequest(scriptUrl);
    });
}

app.post('/api/submit', async (req, res) => {
    const { type, text } = req.body;
    if (!type || !text) return res.status(400).json({ error: 'Missing fields' });

    const subject = type === 'wish' ? '🌟 New Birthday Wish' : '📝 New Birthday Quote';

    try {
        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: process.env.RECIPIENT_EMAIL,
            subject,
            html: `<h2>${subject}</h2><p>${text.replace(/\n/g, '<br>')}</p><p><small>${new Date().toLocaleString()}</small></p>`
        });
        console.log('Email sent to', process.env.RECIPIENT_EMAIL);
    } catch (err) {
        console.error('Email error:', err.message);
    }

    try {
        await logToSheet(type, text);
    } catch (err) {
        console.error('Sheet error:', err.message);
    }

    res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
