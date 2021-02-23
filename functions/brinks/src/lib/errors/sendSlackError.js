export default class SendSlackError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SendSlackError';
  }
}
