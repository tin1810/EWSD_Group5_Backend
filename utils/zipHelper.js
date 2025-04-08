const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const createZip = async (files, outputPath) => {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    files.forEach((file) => {
      archive.file(file.path, { name: file.name });
    });

    archive.finalize();
  });
};

module.exports = { createZip };