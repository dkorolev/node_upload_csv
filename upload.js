// npm i formidable csv-parser pg

const http = require('http');
const formidable = require('formidable');
const csv_parser = require('csv-parser');
const pg = require('pg');

const port = 5555;

const server = http.createServer(async (req, res) => {
  res.json = (obj, code) => {
    res.writeHead(code || 400, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(obj));
  };
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
      res.json({err, fields, files}, err ? 400 : 200);
    });
  } else if (req.url === '/db') {
    const db = new pg.Client();
    db.connect((err, conn) => {
      if (err) {
        res.json({error: 'DB unavailable.'});
      } else {
        conn.query('select current_date as date, current_time as time', (err, sql) => {
          if (err) {
            res.json({error: 'SQL failed.'});
          } else {
            res.json({date: sql.rows[0].date, time: sql.rows[0].time});
          }
          conn.end();
        });
      }
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
