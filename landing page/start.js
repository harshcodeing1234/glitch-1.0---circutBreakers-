#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 3001;

console.log('🚀 Starting Project Pulse...');
console.log(`📍 Server will be available at: http://localhost:${PORT}`);
console.log('📝 Press Ctrl+C to stop the server\n');

// Start the server
const server = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`\n📴 Server stopped with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill('SIGTERM');
});
