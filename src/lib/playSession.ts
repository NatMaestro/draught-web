/**
 * Session flag: user chose "Play as guest" on the /play hub (no account).
 * Cleared when the browser tab closes. Logged-in users ignore this.
 */
export const SESSION_GUEST_PLAY_ACK_KEY = "draught:session:play_guest_ack";

export function setGuestPlayAcknowledged(): void {
  try {
    sessionStorage.setItem(SESSION_GUEST_PLAY_ACK_KEY, "1");
  } catch {
    /* */
  }
}

export function hasGuestPlayAcknowledged(): boolean {
  try {
    return sessionStorage.getItem(SESSION_GUEST_PLAY_ACK_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearGuestPlayAcknowledged(): void {
  try {
    sessionStorage.removeItem(SESSION_GUEST_PLAY_ACK_KEY);
  } catch {
    /* */
  }
}
