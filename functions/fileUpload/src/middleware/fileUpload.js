import Busboy from 'busboy';
import path from 'path';
import os from 'os';
import fs from 'fs';
import debug from 'debug';

const dlog = debug('that:api:gateway:middleware');

// eslint-disable-next-line func-names
export default function (req, res, next) {
  // See https://cloud.google.com/functions/docs/writing/http#multipart_data
  const busboy = Busboy({
    headers: req.headers,
    limits: {
      // Cloud functions impose this restriction anyway
      fileSize: 10 * 1024 * 1024,
    },
  });

  const fields = {};
  const files = [];
  const fileWrites = [];
  // Note: os.tmpdir() points to an in-memory file system on GCF
  // Thus, any files in it must fit in the instance's memory.
  const tmpdir = os.tmpdir();

  busboy.on('field', (key, value) => {
    // You could do additional deserialization logic here, values will just be
    // strings
    fields[key] = value;
  });

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    dlog('tmpdir: %o, filename: %o', tmpdir, filename);
    const filepath = path.join(tmpdir, filename?.filename);
    dlog(`Handling file upload field ${fieldname}: ${filename} (${filepath})`);
    const writeStream = fs.createWriteStream(filepath);
    file.pipe(writeStream);

    fileWrites.push(
      new Promise((resolve, reject) => {
        file.on('end', () => writeStream.end());
        writeStream.on('finish', () => {
          // eslint-disable-next-line consistent-return
          fs.readFile(filepath, (err, buffer) => {
            const size = Buffer.byteLength(buffer);
            dlog(`${filename} is ${size} bytes`);
            if (err) {
              return reject(err);
            }

            files.push({
              fieldname,
              originalname: filename,
              encoding,
              mimetype,
              buffer,
              size,
            });

            try {
              fs.unlinkSync(filepath);
            } catch (error) {
              return reject(error);
            }

            resolve();
          });
        });
        writeStream.on('error', reject);
      }),
    );
  });

  busboy.on('finish', () => {
    Promise.all(fileWrites)
      .then(() => {
        req.body = fields;
        req.files = files;
        next();
      })
      .catch(next);
  });

  busboy.end(req.rawBody);
}
