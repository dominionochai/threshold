/** The demo call is scripted unless THRESHOLD_CALL_MODE=live. Read per call so it can change without a rebuild. */
export const isScripted = () => process.env.THRESHOLD_CALL_MODE !== "live";
