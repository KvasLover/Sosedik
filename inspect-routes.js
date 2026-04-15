const express = require('express');
const adsRoutes = require('./src/routes/ads');
const app = express();
app.use('/api/ads', adsRoutes);
console.log(app._router.stack
  .filter(r => r.name === 'router')
  .map(r => ({ path: r.regexp, methods: Object.keys(r.methods), stack: r.handle.stack.map(s => ({ path: s.route ? s.route.path : null, methods: s.route ? Object.keys(s.route.methods) : null })) })));
