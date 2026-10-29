#!/usr/bin/env bash
# Patches vulnerable bundled dependencies that npm overrides cannot reach.
# Patches both the actual node_modules files AND the package-lock.json
# so that npm audit and security scanners report clean results.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

patched=0

patch_one() {
    local target="$1"
    local source="$2"
    local pkg_name="$3"

    if [ ! -d "$target" ] || [ ! -d "$source" ]; then
        return
    fi

    local current_ver safe_ver
    current_ver=$(node -p "require('./$target/package.json').version" 2>/dev/null || echo "unknown")
    safe_ver=$(node -p "require('./$source/package.json').version" 2>/dev/null || echo "unknown")

    if [ "$current_ver" = "$safe_ver" ] || [ "$current_ver" = "unknown" ] || [ "$safe_ver" = "unknown" ]; then
        return
    fi

    echo "  Patching $target: ${pkg_name:-dep} $current_ver -> $safe_ver"
    rm -rf "$target"
    cp -r "$source" "$target"
    patched=$((patched + 1))
}

# ---- minimatch patches ----
patch_one "node_modules/projen/node_modules/minimatch" "node_modules/eslint/node_modules/minimatch" "minimatch"
patch_one "node_modules/projen/node_modules/glob/node_modules/minimatch" "node_modules/readdir-glob/node_modules/minimatch" "minimatch"
patch_one "node_modules/@aws/pdk/node_modules/minimatch" "node_modules/minimatch" "minimatch"

# ---- fast-xml-parser patches ----
patch_one "node_modules/@aws-amplify/data-construct/node_modules/fast-xml-parser" "node_modules/fast-xml-parser" "fast-xml-parser"
patch_one "node_modules/@aws-amplify/graphql-api-construct/node_modules/fast-xml-parser" "node_modules/fast-xml-parser" "fast-xml-parser"

# ---- Update package-lock.json ----
if [ -f "package-lock.json" ] && [ $patched -gt 0 ]; then
    echo "  Updating package-lock.json entries..."
    node -e "
const fs = require('fs');
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const pkgs = lock.packages || {};

const patches = [
    ['node_modules/projen/node_modules/minimatch', 'node_modules/eslint/node_modules/minimatch'],
    ['node_modules/projen/node_modules/glob/node_modules/minimatch', 'node_modules/readdir-glob/node_modules/minimatch'],
    ['node_modules/@aws/pdk/node_modules/minimatch', 'node_modules/minimatch'],
    ['node_modules/@aws-amplify/data-construct/node_modules/fast-xml-parser', 'node_modules/fast-xml-parser'],
    ['node_modules/@aws-amplify/graphql-api-construct/node_modules/fast-xml-parser', 'node_modules/fast-xml-parser']
];

for (const [target, source] of patches) {
    if (pkgs[target] && pkgs[source]) {
        const oldVer = pkgs[target].version;
        const pkg = target.split('node_modules/').pop();
        pkgs[target] = JSON.parse(JSON.stringify(pkgs[source]));
        console.log('  Lockfile: ' + pkg + ' in ' + target + ': ' + oldVer + ' -> ' + pkgs[target].version);
    }
}

fs.writeFileSync('package-lock.json', JSON.stringify(lock, null, 2) + '\n');
"
fi

if [ $patched -gt 0 ]; then
    echo "Patched $patched bundled dependencies"
else
    echo "No vulnerable bundled dependencies found"
fi
