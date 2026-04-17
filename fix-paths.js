const fs = require('fs');
const path = require('path');

/**
 * Script pour corriger les chemins absolus (ex: /_next) en chemins relatifs (ex: ./_next)
 * pour que l'export statique de Next.js fonctionne parfaitement sous Electron (file://)
 */

const outDir = path.join(__dirname, 'frontend', 'out');

if (!fs.existsSync(outDir)) {
    console.warn('⚠️ Le dossier "frontend/out" n\'existe pas encore. Lancez d\'abord le build de Next.js.');
    process.exit(0); // On ne fait pas échouer le script si le dossier n'est pas là
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            walk(filePath);
        } else if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css')) {
            let content = fs.readFileSync(filePath, 'utf8');
            
            // On calcule la profondeur relative (combien de ../ il faut)
            const depth = filePath.split(path.sep).length - outDir.split(path.sep).length - 1;
            const prefix = depth > 0 ? '../'.repeat(depth) : './';
            
            // Regex pour trouver les chemins absolus commençant par /_next, /static, /images, /fonts
            // (on cherche ces préfixes précédés par src=", href=" ou url(")
            const pattern = /(src="|href="|url\(")\/(?=_next\/|static\/|images\/|fonts\/|logo_)/g;
            
            if (pattern.test(content)) {
                // On remplace le "/" par le préfixe relatif approprié
                const newContent = content.replace(pattern, `$1${prefix}`);
                fs.writeFileSync(filePath, newContent);
                console.log(`✅ Corrigé : ${path.relative(outDir, filePath)} (Profondeur: ${depth})`);
            }
        }
    }
}

console.log('🚀 Démarrage de la correction des chemins pour Electron...');
walk(outDir);
console.log('🎉 Correction terminée !');
