const path = require('path');
const fs = require('fs');
const { buildSync } = require('esbuild');

const apiRoot = path.resolve(__dirname, '..');
const monorepoRoot = path.resolve(apiRoot, '../..');
const entryPoint = path.join(apiRoot, 'src/index.ts');
const indexFile = path.join(apiRoot, 'index.js');
const serverlessFile = path.join(apiRoot, 'serverless.js');
const appFile = path.join(apiRoot, 'app.js');

console.log('[build-serverless] Bundling Express API into standalone index.js...');

buildSync({
  entryPoints: [entryPoint],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: indexFile,
  banner: {
    js: `
if (process.platform === 'linux' && !process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
  const path = require('path');
  const fs = require('fs');
  const candidates = [
    path.join(__dirname, 'libquery_engine-rhel-openssl-3.0.x.so.node'),
    path.join(process.cwd(), 'libquery_engine-rhel-openssl-3.0.x.so.node'),
    path.join(process.cwd(), 'apps/api/libquery_engine-rhel-openssl-3.0.x.so.node'),
    '/var/task/libquery_engine-rhel-openssl-3.0.x.so.node',
    '/var/task/apps/api/libquery_engine-rhel-openssl-3.0.x.so.node',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = c;
      break;
    }
  }
}
`,
  },
  footer: {
    js: 'module.exports = app; module.exports.default = app; module.exports.app = app;',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.VERCEL': '"1"',
  },
});

console.log(`[build-serverless] Bundle successfully created at: ${indexFile}`);

// Mirror bundle to serverless.js and app.js for complete compatibility across Vercel resolution strategies
fs.copyFileSync(indexFile, serverlessFile);
fs.writeFileSync(
  appFile,
  "const app = require('./index.js');\nmodule.exports = app;\nmodule.exports.default = app;\nmodule.exports.app = app;\n"
);
console.log(`[build-serverless] Mirrored bundle to ${serverlessFile} and ${appFile}`);

// Helper to find files recursively
function findFiles(dir, predicate) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Avoid recursing into huge unrelated dirs
      if (entry.name !== '.git' && entry.name !== 'apps' && entry.name !== 'dist') {
        results.push(...findFiles(fullPath, predicate));
      }
    } else if (predicate(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log('[build-serverless] Locating Prisma query engines and schema...');

// Search locations for Prisma engine files
const searchRoots = [
  path.join(monorepoRoot, 'node_modules/.pnpm'),
  path.join(monorepoRoot, 'node_modules/.prisma'),
  path.join(monorepoRoot, 'packages/database/node_modules'),
  path.join(apiRoot, 'node_modules'),
];

const foundNodeFiles = new Set();
let foundSchemaFile = null;

for (const searchRoot of searchRoots) {
  if (!fs.existsSync(searchRoot)) continue;
  const nodeFiles = findFiles(searchRoot, (name) => name.endsWith('.node') && name.includes('query_engine'));
  for (const f of nodeFiles) {
    foundNodeFiles.add(f);
  }
  if (!foundSchemaFile) {
    const schemaFiles = findFiles(searchRoot, (name) => name === 'schema.prisma');
    if (schemaFiles.length > 0) {
      foundSchemaFile = schemaFiles[0];
    }
  }
}

// Fallback for schema.prisma from packages/database
if (!foundSchemaFile) {
  const repoSchema = path.join(monorepoRoot, 'packages/database/prisma/schema.prisma');
  if (fs.existsSync(repoSchema)) {
    foundSchemaFile = repoSchema;
  }
}

console.log(`[build-serverless] Found ${foundNodeFiles.size} query engine binaries:`);
for (const enginePath of foundNodeFiles) {
  const baseName = path.basename(enginePath);
  const destPath = path.join(apiRoot, baseName);
  fs.copyFileSync(enginePath, destPath);
  console.log(`  - Copied ${baseName} -> ${destPath}`);
}

if (foundSchemaFile) {
  const destSchema = path.join(apiRoot, 'schema.prisma');
  fs.copyFileSync(foundSchemaFile, destSchema);
  console.log(`  - Copied schema.prisma -> ${destSchema}`);
} else {
  console.warn('[build-serverless] Warning: schema.prisma not found!');
}

// Ensure physical express directory exists in apps/api/node_modules if possible
try {
  const apiNodeModules = path.join(apiRoot, 'node_modules');
  const targetExpress = path.join(apiNodeModules, 'express');
  const rootExpress = path.join(monorepoRoot, 'node_modules', 'express');
  if (fs.existsSync(rootExpress)) {
    if (fs.existsSync(targetExpress) && fs.lstatSync(targetExpress).isSymbolicLink()) {
      fs.unlinkSync(targetExpress);
    }
    if (!fs.existsSync(targetExpress)) {
      fs.cpSync(rootExpress, targetExpress, { recursive: true, dereference: true });
      console.log('[build-serverless] Copied physical express package to apps/api/node_modules/express');
    }
  }
} catch (e) {
  console.warn('[build-serverless] Warning copying express:', e.message);
}

console.log('[build-serverless] Serverless build completed successfully.');
