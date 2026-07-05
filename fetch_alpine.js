const https = require('https');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const child_process = require('child_process');

const repos = [
    'https://dl-cdn.alpinelinux.org/alpine/v3.20/main/aarch64',
    'https://dl-cdn.alpinelinux.org/alpine/v3.20/community/aarch64'
];

const destDir = path.join(__dirname, 'android/app/src/main/assets/alpine-packages');
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// target packages
const targets = ['python3', 'nodejs', 'gcc', 'g++', 'go', 'rust'];

async function download(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                return download(res.headers.location, dest).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to get '${url}' (${res.statusCode})`));
            }
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', reject);
    });
}

async function main() {
    console.log('Downloading APKINDEX files...');
    const indexData = [];
    
    for (let i = 0; i < repos.length; i++) {
        const repo = repos[i];
        const indexFile = path.join(destDir, `APKINDEX-${i}.tar.gz`);
        await download(`${repo}/APKINDEX.tar.gz`, indexFile);
        
        // Extract APKINDEX using Windows tar.exe
        child_process.execSync(`tar -xzf APKINDEX-${i}.tar.gz APKINDEX`, { cwd: destDir });
        
        const content = fs.readFileSync(path.join(destDir, 'APKINDEX'), 'utf8');
        indexData.push({ repo, content });
    }

    console.log('Parsing APKINDEX...');
    const packages = {};
    for (const { repo, content } of indexData) {
        const blocks = content.split('\n\n');
        for (const block of blocks) {
            if (!block.trim()) continue;
            const pkg = { repo, depends: [] };
            for (const line of block.split('\n')) {
                if (line.startsWith('P:')) pkg.name = line.substring(2);
                if (line.startsWith('V:')) pkg.version = line.substring(2);
                if (line.startsWith('D:')) {
                    const deps = line.substring(2).split(' ').filter(Boolean);
                    // Filter out versions and so: rules for simplicity, just get names
                    pkg.depends = deps.map(d => {
                        if (d.startsWith('so:')) return d; // shared lib dependency
                        return d.replace(/[<>=~].*$/, ''); // remove version constraints
                    });
                }
                if (line.startsWith('p:')) {
                    const provides = line.substring(2).split(' ').filter(Boolean);
                    pkg.provides = provides.map(p => p.replace(/[<>=~].*$/, ''));
                }
            }
            if (pkg.name) {
                packages[pkg.name] = pkg;
                // Also map provides to this package
                if (pkg.provides) {
                    for (const p of pkg.provides) {
                        if (!packages[p]) packages[p] = pkg;
                    }
                }
            }
        }
    }

    console.log('Resolving dependencies...');
    const toDownload = new Set();
    const queue = [...targets];
    
    while (queue.length > 0) {
        const target = queue.shift();
        if (toDownload.has(target)) continue;
        
        const pkg = packages[target];
        if (!pkg) {
            // Check if it's a shared library dependency like so:libc.musl-aarch64.so.1
            const soMatch = Object.values(packages).find(p => p.provides && p.provides.includes(target));
            if (soMatch) {
                queue.push(soMatch.name);
            } else {
                console.warn(`Warning: Could not find package '${target}'`);
            }
            continue;
        }
        
        toDownload.add(pkg.name);
        for (const dep of pkg.depends) {
            queue.push(dep);
        }
    }

    console.log(`Found ${toDownload.size} packages to download.`);
    
    for (const name of toDownload) {
        const pkg = packages[name];
        if (!pkg) continue;
        const filename = `${pkg.name}-${pkg.version}.apk`;
        const url = `${pkg.repo}/${filename}`;
        const dest = path.join(destDir, filename);
        
        if (fs.existsSync(dest)) {
            console.log(`Skipping ${filename} (already exists)`);
            continue;
        }
        
        console.log(`Downloading ${filename}...`);
        try {
            await download(url, dest);
        } catch (e) {
            console.error(e.message);
        }
    }
    
    console.log('Done downloading compilers and dependencies.');
}

main().catch(console.error);
