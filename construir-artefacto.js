#!/usr/bin/env node
/**
 * Prepara arcade.html para publicarlo como Artifact.
 *
 * El publicador envuelve el archivo en su propio <!doctype><head><body>, así
 * que el fichero no puede traer esas etiquetas. Lo que NO se puede hacer es
 * tirar el <head> entero: todo el CSS del arcade vive ahí dentro y la página
 * sale sin un solo estilo. Aquí se rescatan <title> y <style> y se pegan
 * delante del contenido del <body>.
 *
 *   node construir-artefacto.js [salida.html]
 */
const fs = require('fs');
const path = require('path');

const ORIGEN = path.join(__dirname, 'arcade.html');
const salida = path.resolve(process.argv[2] || 'arcade-artefacto.html');

if (!fs.existsSync(ORIGEN)){
  console.error('Falta arcade.html. Ejecuta antes: node construir-arcade.js');
  process.exit(1);
}

const src = fs.readFileSync(ORIGEN, 'utf8');
const cabeza = (src.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [, ''])[1];
const cuerpo = (src.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || [, src])[1];

const titulo = (cabeza.match(/<title>[\s\S]*?<\/title>/i) || ['<title>ARCADE NEXO</title>'])[0];
const estilos = (cabeza.match(/<style[\s\S]*?<\/style>/gi) || []);

if (!estilos.length){
  console.error('No se ha encontrado ningún <style> en el <head>: la página saldría sin estilos.');
  process.exit(1);
}

const html = titulo + '\n' + estilos.join('\n') + '\n' + cuerpo;

// Comprobaciones antes de escribir: más vale fallar aquí que publicar algo roto.
const problemas = [];
if (/<(!DOCTYPE|html|head|body)\b/i.test(html)) problemas.push('quedan etiquetas de documento');
if (!/<title>/i.test(html)) problemas.push('falta el <title>');
if (!/<script/i.test(html)) problemas.push('falta el <script> del arcade');
if (problemas.length){
  console.error('No se escribe nada: ' + problemas.join('; '));
  process.exit(1);
}

fs.writeFileSync(salida, html);
console.log(path.basename(salida) + ' generado: ' + Math.round(html.length / 1024) + ' KB, ' +
            estilos.length + ' bloque(s) de estilo, ' +
            (html.match(/class="pantalla/g) || []).length + ' pantallas.');
