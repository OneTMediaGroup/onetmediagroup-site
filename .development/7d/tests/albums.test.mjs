import test from 'node:test';import assert from 'node:assert/strict';import {memoryPhotos,albumFields} from '../src/albums.js';
const a='data:image/jpeg;base64,AAAA',b='data:image/jpeg;base64,BBBB';
test('legacy single-photo memories and empty stories remain compatible',()=>{assert.deepEqual(memoryPhotos({photoData:a}),[a]);assert.deepEqual(memoryPhotos({photoData:''}),[]);});
test('the first photo remains the cover and reordering preserves the album',()=>{assert.deepEqual(albumFields([b,a]),{photoData:b,additionalPhotos:[a]});assert.deepEqual(memoryPhotos(albumFields([b,a])),[b,a]);});
test('removing all photos clears both fields and oversized albums are rejected',()=>{assert.deepEqual(albumFields([]),{photoData:'',additionalPhotos:[]});assert.throws(()=>albumFields([a,a,a,a,a]));});
test('display ignores invalid photo data and caps malformed legacy records',()=>{assert.deepEqual(memoryPhotos({photoData:a,additionalPhotos:['https://example.com/a.jpg',b]}),[a,b]);assert.equal(memoryPhotos({photoData:a,additionalPhotos:[a,a,a,a]}).length,4);});
