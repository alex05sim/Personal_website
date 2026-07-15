import type { LucideIcon } from "lucide-react";
import { Camera, Dumbbell, Gamepad2, Music, Trophy } from "lucide-react";

/**
 * Content for the /me page. Everything here is meant to be edited freely -
 * it's the one corner of the site that should sound exactly like Alex.
 *
 * TODO(alex): entries marked with [draft] are my best guess from the rest of
 * the site - replace them with the real details (teams, games, artists, gear).
 */

export type Interest = {
  icon: LucideIcon;
  title: string;
  blurb: string;
};

export const interests: Interest[] = [
  {
    icon: Camera,
    title: "Photography",
    blurb:
      "Roads, horizons, and the occasional night sky. Half the World page exists because I wanted somewhere to put the photos.",
  },
  {
    icon: Gamepad2,
    title: "Gaming",
    blurb:
      "[draft] The COD-style mission intro on the HOPE project was not an accident. Current rotation goes here.",
  },
  {
    icon: Dumbbell,
    title: "Gym",
    blurb:
      "The counterweight to desk hours: pick heavy things up, put them down, think about firmware between sets.",
  },
  {
    icon: Music,
    title: "Music",
    blurb:
      "[draft] On repeat while coding: something with no lyrics until the tests pass. Actual artists go here.",
  },
  {
    icon: Trophy,
    title: "Sports",
    blurb:
      "[draft] Yes, I have teams. Yes, I'm normal about exactly none of them. Name them here at your own risk.",
  },
];

export type BlackHoleQuestion = {
  id: string;
  q: string;
  a: string;
};

/** The preloaded questions orbiting the black hole. */
export const blackHoleQA: BlackHoleQuestion[] = [
  {
    id: "security",
    q: "Why security?",
    a: "I spent a year as a software intern at the NSA before Berkeley. Once you've watched systems get attacked professionally, you stop trusting anything by default - and that mindset stuck. Most of what I build now starts from the question 'assume the other side is smart; what breaks first?'",
  },
  {
    id: "berkeley",
    q: "Why Berkeley?",
    a: "CS for the systems depth, Data Science for the statistics. The projects I care about - satellite links, solar-cycle models - need both halves, and Berkeley is one of the few places where the security course (CS 161) is genuinely feared and loved at the same time.",
  },
  {
    id: "gear",
    q: "Setup & gear?",
    a: "[draft] Windows + a terminal with too many tabs, VS Code, and a camera bag that gets more careful packing than my laptop does. Real gear list goes here - keyboard, camera body, the works.",
  },
  {
    id: "hot-take",
    q: "Hot take?",
    a: "A git log is a better transcript than a transcript. Show me what someone builds when nobody assigned it.",
  },
  {
    id: "space",
    q: "Why the space theme?",
    a: "All of it, honestly: the engineering of spaceflight, the sci-fi that got me here, actual stargazing, and the fact that mission-control UIs look incredible. Once the CubeSat board existed, the theme picked itself.",
  },
  {
    id: "black-hole",
    q: "Is this scientifically accurate?",
    a: "The accretion disk spins the wrong way for at least one observer, the photon ring is CSS, and Hawking radiation does not carry FAQ answers. Otherwise, yes, completely.",
  },
];

export type WeirdFaqItem = {
  q: string;
  a: string;
};

/** Deep-cut FAQ - the interview easter egg. */
export const weirdFaq: WeirdFaqItem[] = [
  {
    q: "Tabs or spaces?",
    a: "Whatever the formatter says. I have real fights to pick.",
  },
  {
    q: "First thing you check on a PCB?",
    a: "Decoupling caps. Ask me why with a straight face.",
  },
  {
    q: "Best sky you've seen?",
    a: "[draft] Still hunting it. Current leader goes here - a place, a night, a reason.",
  },
  {
    q: "If not CS?",
    a: "Astrophysics. I already read the papers for fun; might as well have gotten credit.",
  },
  {
    q: "Debugging ritual?",
    a: "Explain it out loud, blame DNS, discover it was me all along.",
  },
];

export const weirdFaqNote =
  "If you bring one of these up in an interview, I'll know you actually read this far - and I will absolutely respect it.";
