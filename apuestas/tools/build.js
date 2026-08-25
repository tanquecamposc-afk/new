/* Empaqueta el sitio en un solo archivo HTML autocontenido.
   Uso: node tools/build.js [salida]           documento completo
        node tools/build.js --fragmento [sal]  sin <html>/<head>/<body>,
                                               para incrustarlo en otra página */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const args = process.argv.slice(2);
const fragmento = args.includes('--fragmento');
const salida = args.filter(a => !a.startsWith('--'))[0] ||
  path.join(raiz, 'dist', fragmento ? 'kronosbet-fragmento.html' : 'kronosbet.html');
let html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');

/* Solo se incrusta el CSS local; los enlaces remotos (tipografía) quedan tal cual. */
const remotos = [];
html = html.replace(/<noscript>\s*<link rel="stylesheet" href="https?:[^"]+"[^>]*>\s*<\/noscript>\n?/g, '');
html = html.replace(/<link rel="stylesheet" href="([^"]+)"[^>]*>/g, (tag, href) => {
  // El enlace remoto va normalizado: dentro de un artifact los manejadores en
  // línea no corren, así que un media="print" con onload dejaría la fuente sin cargar.
  if (/^https?:/.test(href)) {
    const limpio = `<link rel="stylesheet" href="${href}">`;
    remotos.push(limpio);
    return limpio;
  }
  return '<style>\n' + fs.readFileSync(path.join(raiz, href), 'utf8') + '\n</style>';
});

html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) =>
  '<script>\n' + fs.readFileSync(path.join(raiz, src), 'utf8') + '\n</script>');

if (fragmento) {
  // El fragmento se incrusta en otra página: el nombre va limpio, sin subtítulo.
  const titulo = ((html.match(/<title>([^<]*)<\/title>/) || [])[1] || 'KRONOS BET').split(' — ')[0];
  const estilos = html.match(/<style>[\s\S]*?<\/style>/g) || [];
  const cuerpo = (html.match(/<body>([\s\S]*)<\/body>/) || [])[1] || '';
  html = `<title>${titulo}</title>\n` + remotos.join('\n') + '\n' +
    estilos.join('\n') + '\n' + cuerpo.trim() + '\n';
}

fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, html);
console.log('Generado ' + salida + ' (' + (fs.statSync(salida).size / 1024).toFixed(1) + ' KB)');
