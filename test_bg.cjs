const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
let match = content.match(/<main[\s\S]*?<\/TransformWrapper>/);
console.log(match ? match[0] : "Not found");
