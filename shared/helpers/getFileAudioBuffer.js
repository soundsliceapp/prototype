const parser = require('mp3-parser');
const concatArrayBuffer = require('../helpers/ArrayBuffer.concat');
const concatAudioBuffer = require('../helpers/AudioBuffer.concat');

const CHUNK_MAX_SIZE = 100 * 1000;

function getArrayBuffer(file) {
  return new Promise(resolve => {
    let fileReader = new FileReader();
    fileReader.onloadend = () => {
      resolve(fileReader.result);
    };
    fileReader.readAsArrayBuffer(file);
  });
}

function decodeArrayBuffer(audioCtx, arrayBuffer) {
  return new Promise(audioCtx.decodeAudioData.bind(audioCtx, arrayBuffer));
}

async function getFileAudioBuffer(file, audioCtx) {
  const arrayBuffer = await getArrayBuffer(file);

  const view = new DataView(arrayBuffer);

  const tags = parser.readTags(view);
  const firstFrame = tags.pop();
  const tagsArrayBuffer = arrayBuffer.slice(0, firstFrame._section.offset);
  let next = firstFrame._section.nextFrameIndex;
  const frames = [firstFrame];
  while (next) {
    const frame = parser.readFrame(view, next);
    frame && frames.push(frame);
    next = frame && frame._section.nextFrameIndex;
  }

  const chunks = frames.reduce((acc, frame) => {
    let chunk = acc[acc.length - 1];

    if (
      !chunk ||
      chunk.byteLength + frame._section.byteLength >= CHUNK_MAX_SIZE
    ) {
      chunk = { byteLength: 0, frames: [] };
    }

    chunk.byteLength = chunk.byteLength + frame._section.byteLength;
    chunk.frames.push(frame);

    if (!acc.includes(chunk)) {
      return acc.concat(chunk);
    }

    return acc;
  }, []);

  const arrayBuffers = chunks.map(chunk => {
    const tmpArrayBuffer = arrayBuffer.slice(
      chunk.frames[0]._section.offset,
      chunk.frames[chunk.frames.length - 1]._section.nextFrameIndex
    );

    return concatArrayBuffer(tagsArrayBuffer, tmpArrayBuffer);
  });

  const audioBuffers = await Promise.all(
    arrayBuffers.map(decodeArrayBuffer.bind(null, audioCtx))
  );

  const audioBuffer = audioBuffers.reduce((acc, audioBuffer_) => {
    if (acc) {
      return concatAudioBuffer(audioCtx, acc, audioBuffer_);
    }

    return audioBuffer_;
  }, null);

  return audioBuffer;
}

module.exports = getFileAudioBuffer;
