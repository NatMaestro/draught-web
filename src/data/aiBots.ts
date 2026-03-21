/**
 * Bot roster for Play vs AI lobby.
 * `engineKey` is sent as `ai_difficulty` — must match backend `get_ai_move` normalization.
 */
export type BotDef = {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  engineKey: string;
};

export type TierDef = {
  id: string;
  label: string;
  subtitle: string;
  bots: BotDef[];
};

/** Ordered tiers: progression from learning to maximum engine strength. */
export const ALL_BOT_TIERS: TierDef[] = [
  {
    id: "adaptive",
    label: "Adaptive",
    subtitle: "Mixes safe and risky replies",
    bots: [
      { id: "ada-1", name: "Flux", tagline: "Keeps you guessing.", emoji: "🌀", engineKey: "adaptive" },
      { id: "ada-2", name: "Mirror", tagline: "Reacts to your tempo.", emoji: "🪞", engineKey: "adaptive" },
      { id: "ada-3", name: "Spar", tagline: "Good warm-up partner.", emoji: "🥊", engineKey: "adaptive" },
      { id: "ada-4", name: "Echo", tagline: "Sometimes sharp, sometimes soft.", emoji: "📡", engineKey: "adaptive" },
      { id: "ada-5", name: "Blend", tagline: "Balanced practice.", emoji: "⚖️", engineKey: "adaptive" },
    ],
  },
  {
    id: "beginner",
    label: "Beginner",
    subtitle: "Friendly for learning the rules",
    bots: [
      { id: "beg-1", name: "Pat", tagline: "Lots of room to experiment.", emoji: "🌱", engineKey: "easy" },
      { id: "beg-2", name: "Dottie", tagline: "Patient and predictable.", emoji: "🐣", engineKey: "easy" },
      { id: "beg-3", name: "Calm Carl", tagline: "Rarely punishes small mistakes.", emoji: "🧘", engineKey: "easy" },
      { id: "beg-4", name: "Sunny", tagline: "Cheerful randomness.", emoji: "☀️", engineKey: "easy" },
      { id: "beg-5", name: "Moss", tagline: "Slow and steady.", emoji: "🌿", engineKey: "easy" },
    ],
  },
  {
    id: "intermediate",
    label: "Intermediate",
    subtitle: "Takes captures when they appear",
    bots: [
      { id: "int-1", name: "Rook", tagline: "Likes trades and jumps.", emoji: "♟️", engineKey: "medium" },
      { id: "int-2", name: "Jade", tagline: "Mandatory captures, no mercy.", emoji: "💎", engineKey: "medium" },
      { id: "int-3", name: "Bolt", tagline: "Fast to snap a piece.", emoji: "⚡", engineKey: "medium" },
      { id: "int-4", name: "Harbor", tagline: "Solid fundamentals.", emoji: "⚓", engineKey: "medium" },
      { id: "int-5", name: "Pixel", tagline: "Crisp and clear.", emoji: "🎮", engineKey: "medium" },
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    subtitle: "Plans a few moves ahead",
    bots: [
      { id: "adv-1", name: "Cipher", tagline: "Minimax search.", emoji: "🔐", engineKey: "hard" },
      { id: "adv-2", name: "Atlas", tagline: "Keeps structure tight.", emoji: "🗺️", engineKey: "hard" },
      { id: "adv-3", name: "Vex", tagline: "Doesn’t miss easy tactics.", emoji: "🎯", engineKey: "hard" },
      { id: "adv-4", name: "Nova", tagline: "Explosive when you slip.", emoji: "✨", engineKey: "hard" },
      { id: "adv-5", name: "Kite", tagline: "Floats then strikes.", emoji: "🪁", engineKey: "hard" },
    ],
  },
  {
    id: "expert",
    label: "Expert",
    subtitle: "Deeper search than Advanced",
    bots: [
      { id: "exp-1", name: "Razor", tagline: "Extra lookahead.", emoji: "🗡️", engineKey: "expert" },
      { id: "exp-2", name: "Marrow", tagline: "Closes the board.", emoji: "🦴", engineKey: "expert" },
      { id: "exp-3", name: "Glitch", tagline: "Uncomfortable positions.", emoji: "👾", engineKey: "expert" },
      { id: "exp-4", name: "Rift", tagline: "Splits your formation.", emoji: "🌋", engineKey: "expert" },
      { id: "exp-5", name: "Nebula", tagline: "Long-term plans.", emoji: "🌌", engineKey: "expert" },
    ],
  },
  {
    id: "master",
    label: "Master",
    subtitle: "Strong evaluation + deep search",
    bots: [
      { id: "mas-1", name: "Onyx", tagline: "Heavy calculation.", emoji: "⬛", engineKey: "master" },
      { id: "mas-2", name: "Slate", tagline: "Cold and exact.", emoji: "🪨", engineKey: "master" },
      { id: "mas-3", name: "Iris", tagline: "Sharp endgames.", emoji: "🌈", engineKey: "master" },
      { id: "mas-4", name: "Forge", tagline: "Relentless pressure.", emoji: "🔥", engineKey: "master" },
      { id: "mas-5", name: "Quill", tagline: "Precision lines.", emoji: "🪶", engineKey: "master" },
    ],
  },
  {
    id: "top",
    label: "Top players",
    subtitle: "Hardest setting — serious training",
    bots: [
      { id: "top-1", name: "Summit", tagline: "Maximum strength in this build.", emoji: "🏔️", engineKey: "top_players" },
      { id: "top-2", name: "Crown", tagline: "Endgame focus.", emoji: "👑", engineKey: "top_players" },
      { id: "top-3", name: "Edge", tagline: "Finds the squeeze.", emoji: "🧊", engineKey: "top_players" },
      { id: "top-4", name: "Pulse", tagline: "No let-up.", emoji: "💓", engineKey: "top_players" },
      { id: "top-5", name: "Zenith", tagline: "Top of the ladder.", emoji: "🌟", engineKey: "top_players" },
    ],
  },
];
