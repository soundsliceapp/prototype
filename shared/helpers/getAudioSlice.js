const parser = require('mp3-parser');
const ID3Writer = require('browser-id3-writer');
const getDuration = require('../helpers/getDuration');
const concatArrayBuffer = require('../helpers/ArrayBuffer.concat');

/**
 * Get a audio/mpeg Blob out of an ArrayBuffer.
 *
 * @param   {ArrayBuffer} buffer  source array buffer.
 * @return  {Blob}        the audio/mpeg blob created out of the source array buffer.
 */
function getBlob(buffer) {
  return new Blob([buffer], { type: 'audio/mpeg' });
}

/**
 * Get an ObjectURL out of a Blob.
 *
 * @param   {Blob} buffer source array buffer.
 * @return  {ObjectURL}   the ObjectURL created out of the blob.
 */
function getObjectURL(blob) {
  return URL.createObjectURL(blob);
}

/**
 * Create a slice.
 *
 * @param   {File}  file  source file.
 * @return  {object}      { blob, audio }
 */
function getAudioSlice(file, start, end, scrubSourceMetadata = true) {
  return new Promise(function getAudioSlicePromise(resolve) {
    let fileReader = new FileReader();
    fileReader.onloadend = function onFileReaderLoadEnd() {
      let sourceArrayBuffer = fileReader.result;

      // scrub source's metadata..
      if (scrubSourceMetadata) {
        const writer = new ID3Writer(sourceArrayBuffer);
        writer.addTag();
        sourceArrayBuffer = writer.arrayBuffer;
      }

      const view = new DataView(sourceArrayBuffer);

      const tags = parser.readTags(view);
      const id3v2Tag = tags[0];
      const id3v2TagArrayBuffer = sourceArrayBuffer.slice(
        0,
        id3v2Tag._section.byteLength
      );

      const firstFrame = tags.pop();
      let next = firstFrame._section.nextFrameIndex;

      const sliceFrames = [];
      let duration = 0;
      while (next) {
        const frame = parser.readFrame(view, next);
        if (frame) {
          frame.duration = getDuration(
            frame._section.byteLength,
            frame.header.bitrate
          );

          duration += frame.duration;
          if (duration >= start) {
            if (duration > end) {
              break;
            }
            sliceFrames.push(frame);
          }
        }
        next = frame && frame._section.nextFrameIndex;
      }

      const tmpArrayBuffer = sourceArrayBuffer.slice(
        sliceFrames[0]._section.offset,
        sliceFrames[sliceFrames.length - 1]._section.nextFrameIndex
      );

      const sliceArrayBuffer = concatArrayBuffer(
        id3v2TagArrayBuffer,
        tmpArrayBuffer
      );

      const blob = getBlob(sliceArrayBuffer);
      const objectURL = getObjectURL(blob);

      const audio = new Audio();
      audio.src = objectURL;
      audio.loop = true;

      resolve({
        blob,
        audio,
      });
    };

    fileReader.readAsArrayBuffer(file);
  });
}

module.exports = getAudioSlice;
