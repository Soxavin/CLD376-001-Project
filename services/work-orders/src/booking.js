// Asks Booking (through the gateway, with the caller's own token) for a booking.
// Returns { status, body }, or null when the gateway can't be reached or takes
// longer than 5 seconds.
async function getBooking(id, authorization) {
  try {
    const response = await fetch(`${process.env.GATEWAY_INTERNAL_URL}/api/bookings/${id}`, {
      headers: { authorization: authorization || "" },
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  } catch (err) {
    console.error(`Booking call failed: ${err.name}: ${err.message}`);
    return null;
  }
}

module.exports = { getBooking };
