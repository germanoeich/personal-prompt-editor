// This file provides a client-safe database interface
// Actual database operations should only happen on the server side

const clientDb = null;

export default clientDb;

export async function initializeDatabase() {
  // This function is only available on the client side
  throw new Error('Database operations are not available on the client side');
}