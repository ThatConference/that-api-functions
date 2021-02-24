export default class SetFollowError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SetFollowError';
  }
}
