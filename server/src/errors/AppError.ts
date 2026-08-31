export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError"; // helps us differentiate custom intentional error vs JS errors
  }
}
