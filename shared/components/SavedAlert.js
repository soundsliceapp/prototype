const { wire } = require('hypermorphic');
const SuccessMessage = require('./SuccessMessage');

function SavedAlert({ hash, type }) {
  const messages = [
    wire(
      SavedAlert,
      ':1'
    )`This <strong>${type}</strong> has been saved to your browser.`,
    wire(
      SavedAlert,
      ':2'
    )`It is now available on the <a href="/">home screen</a>.`,
    wire(
      SavedAlert,
      ':3'
    )`<a href="${`/saved/slice/${hash}`}">Go to ${type}</a>.`,
  ];

  return SuccessMessage(messages);
}

module.exports = SavedAlert;
