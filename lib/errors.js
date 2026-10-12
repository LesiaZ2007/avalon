// An error caused by the player (bad move, wrong phase). Its message is shown to them as-is.
export class GameError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
