import {build} from 'esbuild';
await build({entryPoints:['src/app.js'],outfile:'../../7d/assets/app.js',bundle:true,minify:true,format:'esm',target:['es2022'],legalComments:'eof'});
