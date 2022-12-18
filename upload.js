// npm i formidable csv-parser pg

const http = require('http');
const formidable = require('formidable');
const csv_parser = require('csv-parser');
const pg = require('pg');
const net = require('node:net');

const port = 5555;

const server = http.createServer(async (req, res) => {
  res.json = (obj, code) => {
    res.writeHead(code || 400, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(obj));
  };
  if (req.method.toLowerCase() === 'post') {
    // Create the upload socket first.
    // The `connected` flag is event-based, becomes `true` on 'connected', `false` on 'error' or 'end'.
    let connected = false;
    const client = net.createConnection(9001, 'localhost')
      .on('connect', () => {
        connected = true;
        // Once the upload socket is connected, begin parsing the body and streaming the data.
        // Parsing the body is done via `npm i formidable`.
        formidable({
          multiples: true,
          fileWriteStreamHandler: () => {
            // This `fileWriteStreamHandler` is the "factory" for the "stream consumer",
            // so that instead of writing the uploded file to disk the data is processed on the fly.
            let count = 0;
            // The on-the-fly processing is done via `npm i csv-parser`.
            return csv_parser()
              .on('headers', (columns) => {
                // For JSON upload, the uploaded type is `Variant<Begin, Data, End>`, where the first type
                // is column headers data, the intermediate one is just the fields, and the latter is the end marker.
                if (connected) {
                  client.write(`${JSON.stringify({begin:{columns}})}\n`);
                }
              })
              .on('data', (row) => {
                // NOTE(dkorolev): Maybe terminate parsing if the upsteam of our JSON-upload socket dropped the connection?
                if (connected) {
                  client.write(`${JSON.stringify({row})}\n`);
                }
                ++count;
              })
              .on('end', () => {
                if (connected) {
                  client.write(`${JSON.stringify({end:{count}})}\n`);
                  client.end();
                }
              })
            }
        }).parse(req, (err, fields, files) => {
          res.json({err, fields, files}, err ? 400 : 200);
        });
      })
      .on('error', () => {
        connected = false;
      })
      .on('end', () => {
        connected = false;
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
