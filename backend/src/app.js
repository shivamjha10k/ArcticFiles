const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const directories = require('./routes/directories');
const files = require('./routes/files');
const search = require('./routes/search');
const podcast = require('./routes/podcast');
const auth = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

app.use('/api', auth);
app.use('/api', directories);
app.use('/api', files);
app.use('/api', search);
app.use('/api', podcast);

app.get('/health', (req, res) => res.json({ ok: true }));

module.exports = app;