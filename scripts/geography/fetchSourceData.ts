import fs from 'fs';
import path from 'path';

const SOURCES = [
  {
    name: 'ne_10m_land.geojson',
    url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson',
  },
  {
    name: 'ne_10m_minor_islands.geojson',
    url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_minor_islands.geojson',
  },
];

async function downloadFile(url: string, destPath: string): Promise<void> {
  if (fs.existsSync(destPath)) {
    console.log(`Using cached file: ${destPath}`);
    return;
  }

  console.log(`Downloading ${url} -> ${destPath}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
  console.log(`Downloaded ${destPath} (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)`);
}

async function main(): Promise<void> {
  const targetDir = path.resolve(process.cwd(), 'data/source');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const src of SOURCES) {
    const dest = path.join(targetDir, src.name);
    await downloadFile(src.url, dest);
  }

  console.log('Source datasets ready in data/source/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
