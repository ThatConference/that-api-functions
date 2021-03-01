export default class SendEmailError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SendEmailError';
  }
}
