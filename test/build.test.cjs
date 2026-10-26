const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('ビルド成果物が生成されている', () => {
  assert.ok(fs.existsSync(path.join(__dirname, '../dist/index.html')), 'dist/index.html が存在する');
});
