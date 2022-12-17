// npm i formidable csv-parser

const http = require('http');
const formidable = require('formidable');
const csv_parser = require('csv-parser');

const port = 5555;

const server = http.createServer((req, res) => {
  if (req.method.toLowerCase() === 'post') {
    formidable({
      multiples: true,
      fileWriteStreamHandler: () => {
        let c = 0;
        return csv_parser()
          .on('data', (data) => { console.log(`ROW: ${JSON.stringify(data)}`); ++c; })
          .on('end', () => console.log(`DONE, ${c} rows.`))
        }
    }).parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
        res.end(String(err));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ fields, files }, null, 2));
    });
  } else {
    res.setHeader('Content-Type', 'text/html');
    res.end(
`
<form action="/post" method="post" enctype="multipart/form-data">
  <input type="file" id="id_file" name="id_file_name">
  <input type="submit">
</form>
`);
  }
});

server.listen(port, () => { console.log(`Listening on http://localhost:${port}`); })
