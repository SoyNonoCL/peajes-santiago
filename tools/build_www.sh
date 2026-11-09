#!/usr/bin/env bash
# Copia los archivos de la app web a www/ (carpeta que empaqueta Capacitor en el APK).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf www && mkdir -p www
cp -r index.html manifest.webmanifest sw.js css js vendor icons data www/
echo "www/ listo"
