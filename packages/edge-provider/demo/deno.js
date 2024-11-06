import app from '../server/index.js';
Deno.serve(app.fetch);
