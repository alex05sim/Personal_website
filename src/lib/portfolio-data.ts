import type { LucideIcon } from "lucide-react";
import {
  Binary,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  Code2,
  Cpu,
  GraduationCap,
  Lock,
  Mail,
  Orbit,
  Satellite,
  ShieldCheck,
  SunMedium,
} from "lucide-react";

export type Domain = "Security" | "Hardware" | "AI";

/** Lowercased domain id used to drive the `data-domain` accent system in CSS. */
export type DomainKey = "security" | "hardware" | "ai";

export function domainKey(domain: Domain): DomainKey {
  return domain.toLowerCase() as DomainKey;
}

export type DomainInfo = {
  domain: Domain;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  signals: string[];
  capabilities: string[];
  /** Slug of the headline project that proves out this domain. */
  projectSlug: string;
};

export type ProjectHighlight = {
  label: string;
  value: string;
};

export type ProjectLink = {
  label: string;
  href: string;
};

export type Project = {
  slug: string;
  title: string;
  domain: Domain;
  period: string;
  status: string;
  /** One-line hook used on cards. */
  tagline: string;
  /** Short paragraph shown at the top of the detail page. */
  summary: string;
  /** The problem the project sets out to solve. */
  problem: string;
  /** What was actually built / done. */
  approach: string[];
  /** Key facts and metrics, surfaced as a spec strip. */
  highlights: ProjectHighlight[];
  stack: string[];
  links: ProjectLink[];
  /** Optional path to a screenshot shown on the detail page, e.g. "/screenshots/foo.png". */
  screenshotHref?: string;
  /** Optional media gallery (images / GIFs / video) shown on the detail page. */
  gallery?: { src: string; caption?: string; video?: boolean }[];
  featured: boolean;
  icon: LucideIcon;
  /** Optional performance comparison rendered as bars on the detail page. */
  benchmark?: {
    caption: string;
    unit: string;
    bars: Array<{ name: string; value: number; display: string; accent?: boolean }>;
  };
};

export type ExperienceItem = {
  role: string;
  org: string;
  location: string;
  period: string;
  icon: LucideIcon;
  points: string[];
  tags: string[];
};

export type SkillGroup = {
  label: string;
  items: string[];
};

export type TravelStop = {
  place: string;
  note: string;
  coordinates: string;
};

export const profile = {
  name: "Alex Simpson",
  shortName: "Alex",
  title: "CS + Data Science @ UC Berkeley",
  tagline: "Security, hardware, and AI — systems built from the board up.",
  intro: "From satellite hardware to cryptosystems — I build for environments where getting it wrong isn't an option.",
  location: "Berkeley, CA · Olney, MD",
  availability: "Open to summer 2026 internships in software, ML, hardware, and security",
  clearance: "Previously held TS/SCI with polygraph — eligible for reactivation",
  email: "alex05sim@berkeley.edu",
  resumeHref: "/resume.pdf",
  githubHref: "https://github.com/alex05sim",
  linkedinHref: "https://www.linkedin.com/in/alexander-simpson-405aa9253/",
};

export const education = {
  school: "University of California, Berkeley",
  degree: "B.A. Computer Science + Data Science",
  graduation: "Expected May 2028",
  gpa: "3.78 / 4.0",
  coursework: [
    "CS 189 — Machine Learning",
    "CS 170 — Algorithms",
    "CS 61C — Computer Architecture",
    "CS 161 — Computer Security",
    "CS 70 — Discrete Math & Probability",
    "EECS 16AB — Linear Algebra & Systems",
    "CS 61A / 61B",
  ],
};

export const navigationTabs = [
  { label: "Home", href: "/" },
  { label: "Work", href: "/#work" },
  { label: "Projects", href: "/projects" },
  { label: "Skills", href: "/#skills" },
  { label: "World", href: "/world" },
  { label: "Contact", href: "/#contact" },
  { label: "Plain", href: "/plain" },
];

export const domains: DomainInfo[] = [
  {
    domain: "Security",
    label: "Security",
    title: "Security, from the threat model up.",
    description:
      "I design systems for the world where the attacker is already inside — assuming a hostile storage layer or a tampered packet, and making confidentiality and integrity guarantees that hold anyway.",
    icon: ShieldCheck,
    signals: ["Applied cryptography", "Threat modeling", "Secure systems design"],
    capabilities: [
      "Reason about trust boundaries and adversary models",
      "Build authenticated encryption and access control that holds up",
      "Translate security risk into clear engineering decisions",
    ],
    projectSlug: "secure-file-storage",
  },
  {
    domain: "Hardware",
    label: "Hardware",
    title: "Hardware, built for the real world.",
    description:
      "Custom PCBs, embedded firmware, and RF links that have to survive a battery budget, patchy connectivity, and the demand that the data they send is provably authentic.",
    icon: Cpu,
    signals: ["PCB design (KiCad)", "Embedded C", "RF & secure elements"],
    capabilities: [
      "Take a board from schematic to layout to bring-up",
      "Build firmware pipelines from sensor to signed packet",
      "Engineer for power, range, and field resilience",
    ],
    projectSlug: "cubesat-telemetry-pcb",
  },
  {
    domain: "AI",
    label: "AI & GPU computing",
    title: "AI and GPU computing that actually runs.",
    description:
      "Numerical simulation and machine learning where performance is a feature — accelerating heavy compute on the GPU and validating that fast still means correct.",
    icon: BrainCircuit,
    signals: ["GPU acceleration (CUDA / CuPy)", "PyTorch & scikit-learn", "Numerical methods"],
    capabilities: [
      "Move heavy compute onto the GPU and measure the win",
      "Build validation frameworks that catch silent numerical drift",
      "Model real time-series with regression and sequence methods",
    ],
    projectSlug: "orbital-mechanics-simulator",
  },
];

export const projects: Project[] = [
  {
    slug: "cubesat-telemetry-pcb",
    title: "CubeSat Secure Telemetry PCB",
    domain: "Hardware",
    period: "Spring 2026",
    status: "Flagship build",
    tagline: "A battery-powered telemetry board that signs its own data in hardware.",
    summary:
      "A custom PCB built around an ESP32-S3 with LoRa, GNSS, and a dedicated secure element — designed for real deployment, where a board has to run on a battery, ride out patchy connectivity, and prove that the data it transmits actually came from it.",
    problem:
      "Remote telemetry is only useful if you can trust it. A field device has to capture sensor data, package it, and send it over long range — but anything in that path can spoof or tamper with a packet. The hard part is making authenticity a hardware guarantee rather than a software promise, on a board that also has to sip power and tolerate dropped links.",
    approach: [
      "Designed the full schematic and PCB layout in KiCad around an ESP32-S3, a LoRa radio, a GNSS receiver, and an ATECC608A secure element.",
      "Implemented hardware-backed cryptographic signing so every telemetry packet is signed by a key that never leaves the secure element.",
      "Built the end-to-end firmware pipeline in C: sensor acquisition → packet construction → signing → wireless transmission.",
      "Engineered for the field with onboard storage, power management, and resilience to intermittent connectivity.",
    ],
    highlights: [
      { label: "MCU", value: "ESP32-S3" },
      { label: "Radio", value: "SX1262 · 915 MHz" },
      { label: "Link", value: "LoRa + GNSS" },
      { label: "Trust model", value: "HMAC + post-quantum" },
    ],
    stack: ["KiCad", "ESP-IDF", "C", "Python", "SX1262", "GNSS", "ML-KEM/ML-DSA"],
    links: [
      { label: "View on GitHub", href: "https://github.com/alex05sim/CubeSat-telemetry-" },
    ],
    gallery: [
      { src: "/screenshots/cubesat-board.jpg", caption: "The assembled board, hand-soldered." },
      { src: "/screenshots/cubesat-dashboard.mp4", video: true, caption: "Master Control ground station, live." },
    ],
    featured: true,
    icon: Satellite,
  },
  {
    slug: "orbital-mechanics-simulator",
    title: "Orbital Mechanics Simulator",
    domain: "AI",
    period: "Fall 2025",
    status: "GPU-accelerated engine",
    tagline: "An N-body gravitational simulator that runs on the GPU — and proves it stays accurate.",
    summary:
      "A numerical simulation engine for N-body gravitational systems, accelerated on the GPU and validated against the physics it claims to model. It's also the system behind the orbital scene on the home page.",
    problem:
      "N-body gravitation scales badly — every body pulls on every other, so a naive simulation crawls as the system grows, and small integration errors quietly destroy physical accuracy over long runs.",
    approach: [
      "Built the simulation core around Verlet integration for stable, energy-preserving long-horizon dynamics.",
      "Accelerated the heavy per-step computation on the GPU with CuPy, reaching roughly a 40% speedup over the CPU baseline.",
      "Designed a validation framework using energy-conservation checks to catch numerical drift before it corrupts a run.",
      "Added 3D visualization so the system's behavior is inspectable, not just numeric.",
    ],
    highlights: [
      { label: "Method", value: "Verlet integration" },
      { label: "Acceleration", value: "CuPy / GPU" },
      { label: "Speedup", value: "~40% over CPU" },
      { label: "Validation", value: "Energy conservation" },
    ],
    stack: ["Python", "CuPy", "NumPy", "VisPy", "CUDA"],
    links: [],
    gallery: [{ src: "/screenshots/orbital-sim.png", caption: "GPU-accelerated N-body run, 3D view." }],
    featured: true,
    icon: Orbit,
    benchmark: {
      caption:
        "Moving the per-step force computation to the GPU with CuPy cut roughly 40% off the CPU baseline, while energy-conservation checks confirmed the faster path stayed physically accurate.",
      unit: "Relative time per integration step — shorter is faster",
      bars: [
        { name: "CPU · NumPy", value: 100, display: "1.00×" },
        { name: "GPU · CuPy", value: 60, display: "~0.6×", accent: true },
      ],
    },
  },
  {
    slug: "secure-file-storage",
    title: "Secure File Storage & Sharing",
    domain: "Security",
    period: "Spring 2026",
    status: "CS 161 · Project 2",
    tagline: "Zero-trust file system in Go — the server can be fully compromised and it still learns nothing.",
    summary:
      "Berkeley CS 161 (Computer Security) Project 2. The spec hands you a datastore controlled by an active adversary and asks you to build a working file system on top of it in Go — confidentiality, integrity, authenticated multi-user sharing, and cascading revocation, all without ever trusting the storage layer. Files live in Argon2-keyed chains of 1024-byte AEAD blocks. Sharing uses PKE-encrypted capability envelopes signed by the sender. Revocation rotates the file key and BFS-prunes the entire downstream access subtree.",
    problem:
      "The spec's threat model is blunt: the datastore is fully compromised — an adversary can read, modify, and replay anything on disk. The system still has to guarantee confidentiality, integrity, authenticated sharing, cascading revocation, and O(1) append bandwidth. Go was the implementation language, which meant marshaling crypto keys to JSON, working with interface{} primitives, and keeping the 5-layer pointer chain consistent across sessions.",
    approach: [
      "Chose implicit authentication over a separate password verifier. Argon2 derives a 32-byte masterKey directly from credentials — if the password is wrong, the masterKey is wrong, and HMAC verification silently fails when unsealing the UserRecord. No extra round-trip to the datastore, no verifier an attacker can query. Getting this right in Go meant carefully sequencing the JSON unmarshal of PKE and DS private keys after decryption.",
      "Stored files as a 5-layer cryptographic pointer chain: User → Access → AccessNode → FileMetadata → 1024-byte FileBlocks, each AEAD-sealed under a per-file FileRootKey. The spec mandated O(1) append bandwidth, which forced the tail-pointer design — AppendToFile touches only the new block, the old tail, and the metadata header, regardless of file size.",
      "Sharing issues a sealed InviteEnvelope: an inviteRootKey encrypts the capability payload, the key is PKE-wrapped to the recipient's public key, and the whole envelope is signed with the sender's DS key so the recipient can verify origin. Each sharer gets an independent AccessNode in the capability tree — the key design decision that makes per-user revocation possible.",
      "Cascading revocation was the hardest part. If Alice shares with Bob who shares with Carol, revoking Bob must also cut Carol — the spec was explicit about this. The solution: BFS-collect the full downstream subtree from the ShareRecord, rotate FileRootKey and MetaUUID, rewrite every block under fresh material, update all surviving AccessNodes, and tombstone pending invites to prevent accept-after-revoke. Getting the share tree traversal correct without corrupting survivor access required careful sequencing.",
    ],
    highlights: [
      { label: "Course", value: "CS 161 · Berkeley" },
      { label: "Language", value: "Go" },
      { label: "Append cost", value: "O(1) writes" },
      { label: "Revocation", value: "Key rotation + BFS" },
    ],
    stack: ["Go", "Argon2", "PKE", "Digital signatures", "Encrypt-then-MAC", "AEAD"],
    links: [],
    featured: true,
    icon: Binary,
    benchmark: {
      caption:
        "AppendToFile issues exactly 3 datastore writes — new block, old tail pointer update, metadata tail update — regardless of how many blocks the file has grown to.",
      unit: "Datastore writes per AppendToFile · 100-block baseline · fewer is better",
      bars: [
        { name: "Naive O(n) full-file rewrite", value: 100, display: "100 writes" },
        { name: "Linked-list O(1) tail append", value: 5, display: "3 writes", accent: true },
      ],
    },
  },
  {
    slug: "solar-cycle-prediction",
    title: "Solar Cycle Analysis & Prediction",
    domain: "AI",
    period: "Spring 2026",
    status: "Berkeley research",
    tagline: "Forecasting solar activity from decades of noisy time-series data.",
    summary:
      "Berkeley research building pipelines for large-scale time-series analysis of solar activity, and modeling the cycle's roughly periodic behavior with statistical and machine-learning methods.",
    problem:
      "Solar cycles are approximately periodic but long and noisy — predicting them means wrangling large, messy time-series and finding structure stable enough to actually forecast.",
    approach: [
      "Built pipelines for large-scale time-series analysis of solar activity data.",
      "Engineered time-series features and trained regression and sequence models to capture periodic behavior.",
      "Explored cycle predictability through data-driven modeling and feature extraction.",
    ],
    highlights: [
      { label: "Context", value: "Berkeley research" },
      { label: "Data", value: "Solar time-series" },
      { label: "Models", value: "Regression / sequence" },
      { label: "Focus", value: "Forecasting" },
    ],
    stack: ["Python", "Pandas", "scikit-learn", "NumPy"],
    links: [],
    gallery: [{ src: "/screenshots/solar.png", caption: "Forecast vs. observed sunspot number." }],
    featured: false,
    icon: SunMedium,
  },
];

export const featuredProjects = projects.filter((project) => project.featured);

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}

export function projectsByDomain(domain: Domain): Project[] {
  return projects.filter((project) => project.domain === domain);
}

export const experience: ExperienceItem[] = [
  {
    role: "Student Software Intern",
    org: "National Security Agency",
    location: "Fort Meade, MD",
    period: "Aug 2023 – May 2024",
    icon: Building2,
    points: [
      "Worked in a secure, mission-critical environment under TS/SCI clearance.",
      "Developed internal automation tools that improved cybersecurity workflow efficiency.",
      "Supported migration of a secure internal database with integrity validation and testing.",
    ],
    tags: ["Security", "Automation", "Databases"],
  },
  {
    role: "Junior & Tech Mentor",
    org: "Computer Science Mentors · UC Berkeley",
    location: "Berkeley, CA",
    period: "Spring 2025 – Present",
    icon: GraduationCap,
    points: [
      "Lead weekly sections teaching RISC-V architecture, pipelining, cache behavior, and memory hierarchy.",
      "Mentor students through debugging low-level systems code and architecture reasoning.",
      "Collaborate on a version-controlled codebase supporting instructional infrastructure.",
    ],
    tags: ["RISC-V", "Architecture", "Teaching"],
  },
];

export const skills: SkillGroup[] = [
  { label: "Languages", items: ["Python", "Java", "C", "Go", "SQL"] },
  { label: "Machine learning", items: ["PyTorch (CUDA)", "scikit-learn", "Neural networks"] },
  { label: "Scientific computing", items: ["NumPy", "CuPy", "Pandas", "Plotly"] },
  { label: "Systems & tools", items: ["Linux", "Git", "Docker", "SQLite / MySQL", "Kubernetes"] },
  { label: "Hardware", items: ["KiCad", "PCB design", "ESP32", "RF systems"] },
];

export const socials = [
  { label: "Email", href: `mailto:${profile.email}`, icon: Mail },
  { label: "GitHub", href: profile.githubHref, icon: Code2 },
  { label: "LinkedIn", href: profile.linkedinHref, icon: BriefcaseBusiness },
];

export const travelStops: TravelStop[] = [
  {
    place: "Berkeley, California",
    note: "Home base — coursework, research, and most of the building happens here.",
    coordinates: "37.8715 N / 122.2730 W",
  },
  {
    place: "Olney, Maryland",
    note: "Where I grew up, and close to where the NSA work happened.",
    coordinates: "39.1532 N / 77.0669 W",
  },
  {
    place: "Fort Meade, Maryland",
    note: "A year inside a secure, mission-critical environment.",
    coordinates: "39.1080 N / 76.7710 W",
  },
];

export const suggestedPlaces = [
  "Tokyo, Japan",
  "Reykjavik, Iceland",
  "Seoul, South Korea",
];
