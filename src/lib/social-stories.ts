/* ── Social Stories ──────────────────────────────────────────
   Curated picture-based narratives for neurodivergent children.
   Each story walks through a common social situation step by step
   using simple language and visual cues.
   ──────────────────────────────────────────────────────────── */

export interface StoryStep {
  text: string;
  emoji: string;
  tip: string;
}

export interface SocialStory {
  id: string;
  title: string;
  description: string;
  icon: string;
  steps: StoryStep[];
}

export const SOCIAL_STORIES: SocialStory[] = [
  {
    id: "going-to-school",
    title: "Going to School",
    description: "What happens when I go to school each morning.",
    icon: "🏫",
    steps: [
      {
        text: "I wake up and get dressed for school.",
        emoji: "👕",
        tip: "Lay out clothes the night before to reduce morning decisions.",
      },
      {
        text: "I eat breakfast to give me energy.",
        emoji: "🥣",
        tip: "Keep breakfast simple and consistent — routine builds comfort.",
      },
      {
        text: "I get my bag and say goodbye to my family.",
        emoji: "🎒",
        tip: "A short goodbye ritual (hug, wave) eases the transition.",
      },
      {
        text: "I travel to school by car, bus, or walking.",
        emoji: "🚌",
        tip: "Talk through the route so it feels predictable.",
      },
      {
        text: "I arrive at school and find my classroom.",
        emoji: "🚪",
        tip: "If possible, visit the classroom before the first day.",
      },
      {
        text: "I see my teacher and my friends. School is starting!",
        emoji: "👋",
        tip: "Praise bravery — arriving at school is an achievement.",
      },
    ],
  },
  {
    id: "doctor-visit",
    title: "Doctor Visit",
    description: "What happens when I visit the doctor.",
    icon: "🩺",
    steps: [
      {
        text: "Today I am going to see the doctor.",
        emoji: "🏥",
        tip: "Give advance notice — surprises increase anxiety.",
      },
      {
        text: "I sit in the waiting room until my name is called.",
        emoji: "🪑",
        tip: "Bring a comfort item or fidget toy for the wait.",
      },
      {
        text: "The doctor says hello and asks how I feel.",
        emoji: "👨‍⚕️",
        tip: "Practice answering 'How do you feel?' at home beforehand.",
      },
      {
        text: "The doctor might check my ears, eyes, or heartbeat.",
        emoji: "👂",
        tip: "Use a toy stethoscope at home so the tools feel familiar.",
      },
      {
        text: "The doctor tells me I am doing great.",
        emoji: "⭐",
        tip: "Celebrate afterwards — a small reward builds positive associations.",
      },
    ],
  },
  {
    id: "birthday-party",
    title: "Birthday Party",
    description: "What happens at a birthday party.",
    icon: "🎂",
    steps: [
      {
        text: "I am invited to a birthday party!",
        emoji: "🎉",
        tip: "Show the invitation and talk through what will happen.",
      },
      {
        text: "I bring a present for my friend.",
        emoji: "🎁",
        tip: "Let your child help choose or wrap the gift.",
      },
      {
        text: "We play games and have fun together.",
        emoji: "🎈",
        tip: "Identify a quiet space at the venue in case of overwhelm.",
      },
      {
        text: "We eat cake and sing Happy Birthday.",
        emoji: "🍰",
        tip: "Warn about loud singing — noise-cancelling headphones help.",
      },
      {
        text: "I say thank you and goodbye when the party is over.",
        emoji: "👋",
        tip: "Practice 'thank you for inviting me' before you go.",
      },
    ],
  },
  {
    id: "going-shopping",
    title: "Going Shopping",
    description: "What happens when we go to the shop.",
    icon: "🛒",
    steps: [
      {
        text: "We are going to the shop to buy things we need.",
        emoji: "📝",
        tip: "Show a visual shopping list so the trip has clear structure.",
      },
      {
        text: "We walk inside and get a trolley or basket.",
        emoji: "🧺",
        tip: "Let your child push the trolley — it gives a sense of control.",
      },
      {
        text: "We look for the things on our list.",
        emoji: "🔍",
        tip: "Assign one item for your child to find — it builds focus.",
      },
      {
        text: "We wait in the queue to pay.",
        emoji: "🧍",
        tip: "Queues are hard — a fidget or counting game helps pass the time.",
      },
      {
        text: "We pay and take our bags to the car.",
        emoji: "💰",
        tip: "Let your child hand the money or card — it builds independence.",
      },
      {
        text: "We go home. Shopping is done!",
        emoji: "🏠",
        tip: "Acknowledge the effort — shopping is sensory-heavy.",
      },
    ],
  },
  {
    id: "bedtime-routine",
    title: "Bedtime Routine",
    description: "What I do before I go to sleep.",
    icon: "🌙",
    steps: [
      {
        text: "It is getting late. Time to start getting ready for bed.",
        emoji: "🕗",
        tip: "Give a 10-minute warning before starting the routine.",
      },
      {
        text: "I brush my teeth to keep them clean.",
        emoji: "🪥",
        tip: "Use a visual timer so brushing has a clear end point.",
      },
      {
        text: "I put on my pyjamas.",
        emoji: "👕",
        tip: "Sensory-friendly fabrics (soft, tagless) make a big difference.",
      },
      {
        text: "I get into bed and we read a story together.",
        emoji: "📖",
        tip: "Same book is fine — repetition is comforting, not boring.",
      },
      {
        text: "I close my eyes and think about something nice.",
        emoji: "😴",
        tip: "A weighted blanket or soft music can help with settling.",
      },
    ],
  },
  {
    id: "making-a-friend",
    title: "Making a Friend",
    description: "How I can make a new friend.",
    icon: "🤝",
    steps: [
      {
        text: "I see someone I would like to play with.",
        emoji: "👀",
        tip: "Point out other children who are also looking for someone to play with.",
      },
      {
        text: "I walk over and say hello. I tell them my name.",
        emoji: "👋",
        tip: "Role-play introductions at home — practice reduces anxiety.",
      },
      {
        text: "I ask if they want to play with me.",
        emoji: "🗣️",
        tip: "Give a specific script: 'Do you want to play [game]?'",
      },
      {
        text: "We play together and take turns.",
        emoji: "🤹",
        tip: "Turn-taking is hard — use a visual cue like passing an object.",
      },
      {
        text: "Sometimes they say no, and that is okay.",
        emoji: "💛",
        tip: "Normalise rejection — 'They might be busy, we can try again.'",
      },
      {
        text: "I can try again another time. I am a good friend.",
        emoji: "🌟",
        tip: "Praise the attempt, not just the outcome.",
      },
    ],
  },
];
