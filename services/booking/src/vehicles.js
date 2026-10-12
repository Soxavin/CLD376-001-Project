// Asks Vehicles (through the gateway, with the customer's own token) whether
// the car belongs to the caller. Returns "owned", "not_owned" or "unavailable".
async function checkVehicle(vehicleId, authorization) {
  let response;
  try {
    response = await fetch(`${process.env.GATEWAY_INTERNAL_URL}/api/vehicles/${vehicleId}`, {
      headers: { authorization },
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    return "unavailable";
  }
  if (response.status === 200) return "owned";
  if (response.status === 403 || response.status === 404) return "not_owned";
  return "unavailable";
}

module.exports = { checkVehicle };
