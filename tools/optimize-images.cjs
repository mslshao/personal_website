const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
// A Git checkout keeps only optimized assets; optionally supply the original site folder.
const sourceRoot = process.argv[2] ? path.resolve(process.argv[2]) : root;
const photos = ['moraine-lake.jpg', 'oahu-night.JPG', 'angels-landing.jpg', 'zion-national-park.jpg',
  'lake-minnewanka.jpg', 'rainier.jpg', 'mount-hood.jpg', 'calico-tanks.jpg', 'red-rock.jpg',
  'hoover-dam.jpg', 'laserdome.jpg', 'header-background.jpg'];
(async () => {
  const out = path.join(root, 'images', 'optimized');
  await fs.mkdir(out, {recursive:true});
  const report = [];
  for (const name of photos) {
    const source = path.join(sourceRoot, 'images', name);
    const stem = path.parse(name).name;
    for (const width of (stem === 'header-background' ? [960, 1920] : [480, 960, 1920])) {
      const target = `${stem}-${width}.webp`;
      const info = await sharp(source).rotate().resize({width, withoutEnlargement:true})
        .webp({quality:width === 1920 ? 88 : 82, effort:6}).toFile(path.join(out, target));
      report.push({source:name, file:target, width:info.width, height:info.height, bytes:info.size});
    }
  }
  await sharp(path.join(sourceRoot, 'favicon.png')).resize(32,32,{fit:'contain',background:'#ffffff00'})
    .png().toFile(path.join(root,'favicon-32.png'));
  await fs.mkdir(path.join(root,'.local','checks'),{recursive:true});
  await fs.writeFile(path.join(root,'.local','checks','images.json'), JSON.stringify(report,null,2));
  console.log(`Created ${report.length} web-sized photos; original photographs are preserved.`);
  console.log(`Gallery 480px total: ${report.filter(x=>x.width===480).reduce((n,x)=>n+x.bytes,0)} bytes`);
})().catch(e=>{console.error(e);process.exit(1)});
