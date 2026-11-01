// Builds standalone/instarank.html: the whole InstaRank toolkit in one file that runs in any
// browser with no server, no login and no payments. It reuses the exact engines in src/.
//   node tools/build-standalone.mjs [--fragment out.html]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = ['text', 'keywords', 'trends', 'captions', 'demo', 'instagram'];

function bundleModule(name) {
  let code = fs.readFileSync(path.join(root, 'src', `${name}.js`), 'utf8');
  code = code.replace(/^import\s*\{([^}]+)\}\s*from\s*'\.\/(\w+)\.js';\s*$/gm, (_, names, mod) => `const {${names}} = __m.${mod};`);
  if (/^import /m.test(code)) throw new Error(`${name}.js has an import the bundler cannot inline`);
  const exported = [...code.matchAll(/^export\s+(?:async\s+)?(?:function|const|class|let)\s+(\w+)/gm)].map((m) => m[1]);
  code = code.replace(/^export\s+/gm, '');
  return `__m.${name} = (() => {\n${code}\nreturn { ${exported.join(', ')} };\n})();`;
}

const engines = `const __m = {};\n${MODULES.map(bundleModule).join('\n\n')}\nconst E = Object.assign({}, ...Object.values(__m));`;
const template = fs.readFileSync(path.join(root, 'standalone', 'template.html'), 'utf8');
const fragment = template.replace('/*__ENGINES__*/', () => engines);

const full = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${fragment}\n</body>\n</html>\n`;
fs.writeFileSync(path.join(root, 'standalone', 'instarank.html'), full);
const fi = process.argv.indexOf('--fragment');
if (fi > 0) fs.writeFileSync(process.argv[fi + 1], fragment);
console.log(`Built standalone/instarank.html (${(full.length / 1024).toFixed(0)} KB)`);
