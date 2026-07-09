const fs = require('fs');
(async () => {
  console.log('downloading admin0 10m...');
  let r = await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson');
  fs.writeFileSync('ne10m.geojson', Buffer.from(await r.arrayBuffer()));
  console.log('admin0:', fs.statSync('ne10m.geojson').size);
  console.log('downloading lakes 10m...');
  r = await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes.geojson');
  fs.writeFileSync('ne10m_lakes.geojson', Buffer.from(await r.arrayBuffer()));
  console.log('lakes:', fs.statSync('ne10m_lakes.geojson').size);

  // AWS terrarium elevation tiles, z7 covering the 1200x800km frame around Israel
  const tiles = [];
  for (let x = 74; x <= 78; x++) for (let y = 50; y <= 53; y++) tiles.push([x, y]);
  fs.mkdirSync('dem', { recursive: true });
  for (const [x, y] of tiles) {
    const u = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/7/${x}/${y}.png`;
    const rr = await fetch(u);
    if (!rr.ok) { console.log('MISS', x, y, rr.status); continue; }
    fs.writeFileSync(`dem/7_${x}_${y}.png`, Buffer.from(await rr.arrayBuffer()));
  }
  console.log('dem tiles:', fs.readdirSync('dem').length);
})();
