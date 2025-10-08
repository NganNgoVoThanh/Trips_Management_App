const fs = require('fs');
const path = require('path');

function fixImports(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir, { withFileTypes: true });
    let count = 0;
    
    files.forEach(file => {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
            count += fixImports(fullPath);
        } else if (file.name.match(/\.(ts|tsx|js|jsx)$/)) {
            let content = fs.readFileSync(fullPath, 'utf8');
            const original = content;
            
            // Fix imports
            content = content.replace(/@\/lib\/supabase-service/g, '@/lib/supabase');
            content = content.replace(/from ['"]\.\.\/\.\.\/lib\/supabase-service['"]/g, "from '../../lib/supabase'");
            content = content.replace(/from ['"]\.\.\/lib\/supabase-service['"]/g, "from '../lib/supabase'");
            content = content.replace(/from ['"]@\/lib\/supabase-service['"]/g, "from '@/lib/supabase'");
            
            if (content !== original) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('✓ Fixed:', fullPath.replace(process.cwd() + path.sep, ''));
                count++;
            }
        }
    });
    
    return count;
}

console.log('🔧 Fixing Supabase imports...\n');

let total = 0;
total += fixImports('./app');
total += fixImports('./lib');
total += fixImports('./components');
total += fixImports('./hooks');

console.log(`\n✅ Done! Fixed ${total} file(s)`);