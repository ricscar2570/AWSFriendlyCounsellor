// Tiny dependency-free ZIP writer using STORE (no compression).
// The format is intentionally small but standards-compliant so generated
// Terraform bundles can be opened by unzip, Explorer, Finder and Python zipfile.
const encoder = new TextEncoder();

function crcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
}
const CRC_TABLE = crcTable();

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(view, offset, value) { view.setUint16(offset, value, true); }
function u32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }

function concat(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}

function localHeader(nameBytes, dataBytes, crc) {
  const header = new Uint8Array(30);
  const v = new DataView(header.buffer);
  u32(v, 0, 0x04034b50);
  u16(v, 4, 20);       // version needed
  u16(v, 6, 0x0800);   // UTF-8 filenames
  u16(v, 8, 0);        // STORE
  u16(v, 10, 0);       // DOS time
  u16(v, 12, 0);       // DOS date
  u32(v, 14, crc);
  u32(v, 18, dataBytes.length);
  u32(v, 22, dataBytes.length);
  u16(v, 26, nameBytes.length);
  u16(v, 28, 0);       // extra length
  return header;
}

function centralHeader(nameBytes, dataBytes, crc, localOffset) {
  const header = new Uint8Array(46);
  const v = new DataView(header.buffer);
  u32(v, 0, 0x02014b50);
  u16(v, 4, 20);       // version made by
  u16(v, 6, 20);       // version needed
  u16(v, 8, 0x0800);   // UTF-8 filenames
  u16(v, 10, 0);       // STORE
  u16(v, 12, 0);       // DOS time
  u16(v, 14, 0);       // DOS date
  u32(v, 16, crc);
  u32(v, 20, dataBytes.length);
  u32(v, 24, dataBytes.length);
  u16(v, 28, nameBytes.length);
  u16(v, 30, 0);       // extra length
  u16(v, 32, 0);       // comment length
  u16(v, 34, 0);       // disk start
  u16(v, 36, 0);       // internal attrs
  u32(v, 38, 0);       // external attrs
  u32(v, 42, localOffset);
  return header;
}

function endOfCentralDirectory(count, centralSize, centralOffset) {
  const end = new Uint8Array(22);
  const v = new DataView(end.buffer);
  u32(v, 0, 0x06054b50);
  u16(v, 4, 0);
  u16(v, 6, 0);
  u16(v, 8, count);
  u16(v, 10, count);
  u32(v, 12, centralSize);
  u32(v, 16, centralOffset);
  u16(v, 20, 0);
  return end;
}

export function zipFiles(files) {
  const locals = [];
  const centrals = [];
  let localOffset = 0;
  let count = 0;

  for (const [name, text] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const dataBytes = encoder.encode(String(text));
    const crc = crc32(dataBytes);
    const local = localHeader(nameBytes, dataBytes, crc);
    locals.push(local, nameBytes, dataBytes);
    centrals.push(centralHeader(nameBytes, dataBytes, crc, localOffset), nameBytes);
    localOffset += local.length + nameBytes.length + dataBytes.length;
    count += 1;
  }

  if (count > 0xffff) throw new Error('ZIP contains too many files for the non-ZIP64 writer.');
  const localBytes = concat(locals);
  const centralBytes = concat(centrals);
  const end = endOfCentralDirectory(count, centralBytes.length, localBytes.length);
  return new Blob([localBytes, centralBytes, end], {type: 'application/zip'});
}
