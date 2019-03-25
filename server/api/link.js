const { encode } = require('punycode');
const { spawnYouTubeDL } = require('../../lib');

async function link(req, res) {
  if (!req.body) return res.sendStatus(400);

  try {
    const ret = await spawnYouTubeDL(req.body.url, req);
    const headers = {
      'content-disposition': `attachment; filename="${encode(ret.title)}"`,
      'content-type': 'audio/mp3',
    };

    res.writeHead(201, headers);
    res.on('error', function(err) {
      ret.fileStream.end();
    });
    ret.fileStream.pipe(res);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
}

module.exports = link;
