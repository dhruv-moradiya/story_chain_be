/**
 * trySafe — Try/catch wrapper for pure async functions (no HTTP request involved).
 *
 * Unlike `catchAsync` which wraps Fastify route handlers (req, reply),
 * this is for any standalone async function — workers, services, scripts, etc.
 *
 * @example
 * // Returns [data, null] on success
 * const [user, error] = await trySafe(() => userRepo.findById(id));
 * if (error) {
 *   logger.error('Failed to fetch user', error);
 *   return;
 * }
 * console.log(user.name);
 *
 * @example
 * // Works with any async function
 * const [result, err] = await trySafe(() => sendEmail(to, subject, body));
 */

type TrySafeSuccess<T> = [data: T, error: null];
type TrySafeFailure = [data: null, error: Error];
type TrySafeResult<T> = TrySafeSuccess<T> | TrySafeFailure;

export async function trySafe<T>(fn: () => Promise<T>): Promise<TrySafeResult<T>> {
  try {
    const data = await fn();
    return [data, null];
  } catch (thrown) {
    const error = thrown instanceof Error ? thrown : new Error(String(thrown));
    return [null, error];
  }
}
