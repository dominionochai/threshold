export interface DemoLine {
  id: string;
  /** Written the way it is spoken, so the voice reads numbers and addresses naturally. */
  text: string;
  /** Acting direction for the voice, so no two lines sound alike. */
  style: string;
}

/**
 * The demo call to PATH, for the case "Harlem, two children aged 2 and 2, a bed tonight".
 * The caller's lines are recorded ahead of time. The staff lines are what you say aloud;
 * the app listens for you to finish speaking, it does not transcribe you.
 */
export const DEMO_CALL = {
  agent: [
    { id: "a1", text: "Hello? Hi, this is Threshold. I'm an AI assistant, calling on behalf of a mother. Is this the PATH intake center?", style: "warm and a little careful, like someone making an important call" },
    { id: "a2", text: "Thank you. She's in Harlem tonight with her two children, both two years old, and they need a place to sleep. Can you take them in tonight?", style: "gentle and steady, a touch of urgency underneath" },
    { id: "a3", text: "Oh, thank goodness. Where should she go, and what time does she need to be there by?", style: "relieved and softer, a quick breath out at the start" },
    { id: "a4", text: "Okay, one fifty-one East one fifty-first Street, before nine. Is there anything she needs to bring?", style: "careful, repeating the address to be sure, unhurried" },
    { id: "a5", text: "Perfect. I'll let her know right away. Thank you so much, you've been a big help. Goodbye.", style: "warm and grateful, closing the call with a smile" },
  ],
  staff: [
    "Yes, this is PATH intake. How can I help you?",
    "Yes, we can. We have a family room available tonight.",
    "Come to 151 East 151st Street in the Bronx, and please arrive before nine tonight.",
    "Just bring any ID you have for her and the children.",
  ],
} as const satisfies { agent: readonly DemoLine[]; staff: readonly string[] };
