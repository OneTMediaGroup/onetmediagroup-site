import {build} from 'esbuild';
await build({entryPoints:['src/app.js'],outdir:'../../7d/assets',bundle:true,splitting:true,minify:true,format:'esm',target:['es2022'],legalComments:'eof',chunkNames:'chunks/[name]-[hash]'});
