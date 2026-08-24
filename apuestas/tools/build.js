/* Empaqueta el sitio en un solo archivo HTML autocontenido.
   Uso: node tools/build.js [salida]   (por defecto dist/kronosbet.html) */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const salida = process.argv[2] || path.join(raiz, 'dist', 'kronosbet.html');
let html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) =>
  '<style>\n' + fs.readFileSync(path.join(raiz, href), 'utf8') + '\n</style>');

html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) =>
  '<script>\n' + fs.readFileSync(path.join(raiz, src), 'utf8') + '\n</script>');

fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, html);
console.log('Generado ' + salida + ' (' + (fs.statSync(salida).size / 1024).toFixed(1) + ' KB)');
