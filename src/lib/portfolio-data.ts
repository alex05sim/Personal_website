import type { LucideIcon } from "lucide-react";
import {
  Binary,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  Code2,
  Cpu,
  GraduationCap,
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

export type ArtifactStatus = "live" | "missing" | "private" | "planned";

export type ProjectProof = {
  label: string;
  detail: string;
  href?: string;
};

export type ArchitectureNode = {
  label: string;
  detail: string;
};

export type BoardSection = {
  title: string;
  refs: string;
  footprint: string;
  description: string;
  designChoices: string[];
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
  /** Recruiter-facing summary of Alex's personal ownership. */
  role: string;
  /** Concrete evidence: source, writeups, implementation facts, screenshots, or privacy explanation. */
  proof: ProjectProof[];
  /** Engineering constraints that shaped the implementation. */
  constraints: string[];
  /** What worked, what was validated, or what the project demonstrates. */
  outcome: string;
  /** Honest next work or artifact gap. */
  nextSteps: string[];
  /** Current availability of public proof artifacts. */
  artifactStatus: ArtifactStatus;
  /** Minimal architecture flow for a project diagram. */
  architecture: ArchitectureNode[];
  /** Optional PCB/footprint walkthrough for hardware projects. */
  boardSections?: BoardSection[];
  /** Key facts and metrics, surfaced as a spec strip. */
  highlights: ProjectHighlight[];
  stack: string[];
  links: ProjectLink[];
  /** Optional path to a screenshot shown on the detail page, e.g. "/screenshots/foo.png". */
  screenshotHref?: string;
  /** Optional media gallery (images / GIFs / video) shown on the detail page. */
  gallery?: { src: string; caption?: string; video?: boolean; fit?: "cover" | "contain" }[];
  /** Recruiter-facing proof status for source, demo, writeup, or private/course work. */
  verification: string;
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
  tagline: "Security, hardware, and AI - systems built from the board up.",
  intro: "UC Berkeley CS + Data Science student building security, hardware, and AI systems - from a signed CubeSat telemetry PCB to zero-trust storage and GPU simulation.",
  location: "Berkeley, CA - Olney, MD",
  availability: "Open to summer 2026 internships in software, ML, hardware, and security",
  clearance: "Previously held TS/SCI with polygraph - eligible for reactivation",
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
    "CS 189 - Machine Learning",
    "CS 170 - Algorithms",
    "CS 61C - Computer Architecture",
    "CS 161 - Computer Security",
    "CS 70 - Discrete Math & Probability",
    "EECS 16AB - Linear Algebra & Systems",
    "CS 61A / 61B",
  ],
};

/** Top navigation — kept tight; secondary destinations live in the footer. */
export const navigationTabs = [
  { label: "Home", href: "/" },
  { label: "Work", href: "/#work" },
  { label: "Projects", href: "/projects" },
  { label: "World", href: "/world" },
  { label: "Contact", href: "/#contact" },
];

/** Footer "Navigate" column — the full map, including recruiter + accessibility pages. */
export const footerNavigation = [
  ...navigationTabs,
  { label: "Hire me", href: "/hire-me" },
  { label: "Plain version", href: "/plain" },
];

export const domains: DomainInfo[] = [
  {
    domain: "Security",
    label: "Security",
    title: "Security, from the threat model up.",
    description:
      "I design systems for the world where the attacker is already inside - assuming a hostile storage layer or a tampered packet, and making confidentiality and integrity guarantees that hold anyway.",
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
      "Numerical simulation and machine learning where performance is a feature - accelerating heavy compute on the GPU and validating that fast still means correct.",
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
      "HOPE is a post-quantum secure satellite data-packing PCB: mission data enters the board, gets packed into efficient chunks, is protected before radio transmission, and leaves as ciphertext.",
    problem:
      "Satellite telemetry has to be designed as if interception is inevitable. In 2018, France accused Russia's Luch/Olymp-K satellite of approaching the French-Italian Athena-Fidus military satellite to intercept communications. More recently, satellite security researchers showed that large amounts of satellite traffic can still be passively intercepted when links are unencrypted or misconfigured. HOPE starts from that threat model: if an adversary collects the RF signal from the ground or from another satellite, the captured data should still be unreadable.",
    approach: [
      "Designed the full schematic and PCB layout in KiCad around an ESP32-S3, a LoRa radio, a GNSS receiver, and an ATECC608A secure element.",
      "Designed the HOPE data path so sensor or onboard-computer data is packed before it reaches the radio.",
      "Built the end-to-end firmware pipeline in C: sensor acquisition -> HOPE packet construction -> protection -> wireless transmission.",
      "Planned lattice-based post-quantum protection around the packet boundary so captured RF yields quantum-resistant ciphertext instead of mission data.",
      "Engineered for the field with onboard storage, power management, and resilience to intermittent connectivity.",
    ],
    role:
      "Owned the board architecture, KiCad schematic/layout, embedded telemetry path, packet authentication model, and Python ground-station workflow.",
    proof: [
      {
        label: "Public repo",
        detail: "Firmware, groundstation, RangePi tools, Wi-Fi UDP backup, replay protection, GNSS parsing, HOPE packet notes, and deployment scripts are public.",
        href: "https://github.com/alex05sim/CubeSat-telemetry-",
      },
      {
        label: "Implemented packet path",
        detail: "README documents ESP32 PCB + GNSS + SX1262 -> LoRa RF -> RangePi -> USB serial -> CubeSat Master Control.",
      },
      {
        label: "Status evidence",
        detail: "Repo status lists GNSS v2 telemetry, replay filtering, dashboard nodes, bring-up checks, and PQ protocol boundaries.",
      },
    ],
    constraints: [
      "Assume the satellite RF link can be intercepted.",
      "Battery and solar power budget.",
      "Post-quantum confidentiality plus authenticity/replay protection on untrusted packets.",
      "Firmware, RF, dashboard, and hardware bring-up had to line up as one system.",
    ],
    outcome:
      "Produced a public end-to-end firmware and ground-station stack around the board, with HOPE packet framing, replay-guarded telemetry, and a dashboard path for simulation, RF bridge, and Wi-Fi fallback.",
    nextSteps: [
      "Add real board and dashboard screenshots under public screenshots when available.",
      "Finish ESP32-side liboqs integration, secure-element key storage, and ciphertext-only packet demos.",
      "Publish a concise hardware bring-up writeup from bench tests.",
    ],
    artifactStatus: "live",
    architecture: [
      { label: "Sensors + GNSS", detail: "BME/IMU/GNSS data sources" },
      { label: "ESP32-S3", detail: "HOPE packet packing and counters" },
      { label: "PQ protection", detail: "Encrypt/sign before the radio" },
      { label: "SX1262 LoRa", detail: "Exposed 915 MHz downlink" },
      { label: "RangePi bridge", detail: "RF to USB serial relay" },
      { label: "Master Control", detail: "Python dashboard and audit tools" },
    ],
    boardSections: [
      {
        title: "Compute and control",
        refs: "U1, U2, U4, SW1, SW2, TP1-TP20",
        footprint: "ESP32-S3-WROOM-1, MCP23017, AT25SF128A, tactile switches, 1 mm test pads",
        description:
          "I built the control section around the ESP32-S3 module, added external QSPI flash, broke out debug/test points, and placed boot/reset controls so the board can be flashed and brought up without extra fixtures.",
        designChoices: [
          "Used the ESP32-S3 module so RF certification/module routing risk stays lower than a bare MCU design.",
          "Added external flash for logs/configuration instead of relying only on internal storage.",
          "Put boot/reset and test pads on the board because bring-up and firmware flashing needed to be practical.",
        ],
      },
      {
        title: "Security and storage",
        refs: "U3, U4",
        footprint: "ATECC608A SOIC-8 secure element, AT25SF128A flash",
        description:
          "I included a dedicated secure-element footprint for hardware-backed key storage and paired it with flash for local data/log storage. This is the board section that answers the trust question: HOPE packets should be protected by device-held material before they ever touch the radio.",
        designChoices: [
          "Separated key storage from the main MCU so the design has a path toward hardware-backed identity.",
          "Designed the section so the receiver can verify origin/freshness and decrypt protected packets instead of trusting the radio link.",
          "Kept the secure element on a simple package/footprint that is easier to assemble and inspect.",
        ],
      },
      {
        title: "Radio and positioning",
        refs: "U21, U23, J4, J5, Y1, L4, L5",
        footprint: "SX1262 QFN-24, u-blox MAX-M10S, U.FL antenna connectors, crystal, RF matching footprints",
        description:
          "I laid out the LoRa and GNSS section with separate RF paths, U.FL connectors, matching-network footprints, and the SX1262/MAX-M10S modules needed for long-range packets and position/time data.",
        designChoices: [
          "Used SX1262 LoRa for long-range low-bandwidth telemetry rather than Wi-Fi as the primary link.",
          "Added U.FL connectors so antennas can be swapped during bench testing.",
          "Left matching-network/DNP footprints so the RF path can be tuned instead of locked in too early.",
        ],
      },
      {
        title: "Power input and regulation",
        refs: "J1, J2, J3, U8, U9, U14, U20, U22, U26, F1, F2, D24-D26, L1-L3",
        footprint: "USB-C, terminal input, MCP73871 charger, TPS63070 buck-boost, TPS22917 load switches, SMA/SOD diodes, inductors",
        description:
          "I designed the power section for USB-C, external/solar input, battery charging, load switching, fusing/protection, and a regulated system rail. This is what lets the board act like a field device instead of just a bench circuit.",
        designChoices: [
          "Supported USB-C plus external/solar-style input so the board can be powered in multiple test setups.",
          "Used a charger and buck-boost regulation path to handle battery operation and varying input voltage.",
          "Added load switches and protection parts so subsystems can be controlled and faults are easier to isolate.",
        ],
      },
      {
        title: "Sensors and timing",
        refs: "U12, U13, U15, U16, U17, U18, U19, D22",
        footprint: "TMP117, VEML7700, LIS2MDL, BME688, OPA381, BNO085, DS3231, TEMD6200 photodiode",
        description:
          "I added the housekeeping and environment sensors: temperature, pressure/gas, light/irradiance, magnetometer, 9-axis IMU, precision timing, and signal conditioning.",
        designChoices: [
          "Grouped housekeeping sensors so the board reports its own environment and attitude context.",
          "Included a DS3231 RTC so telemetry can keep time even when GNSS or network time is unavailable.",
          "Added light/irradiance sensing because power and deployment context matter for a field board.",
        ],
      },
      {
        title: "Monitoring and bring-up",
        refs: "U5, U7, U10, U11, D1-D23, FB1-FB3, H1-H4",
        footprint: "INA228 current monitors, 0603 LEDs, ferrite beads, M3 mounting holes",
        description:
          "I added current monitors, status LEDs, ferrite beads, mounting holes, and test points so the board is easier to debug, measure, and mount during bring-up.",
        designChoices: [
          "Used INA228 monitors on key rails so power behavior can be measured instead of guessed.",
          "Added LEDs and test points for fast bench feedback while firmware is still changing.",
          "Included mounting holes and ferrite beads because mechanical and noise details matter during bring-up.",
        ],
      },
    ],
    highlights: [
      { label: "MCU", value: "ESP32-S3" },
      { label: "Radio", value: "SX1262 - 915 MHz" },
      { label: "Link", value: "LoRa + GNSS" },
      { label: "Trust model", value: "HMAC + post-quantum" },
    ],
    stack: ["KiCad", "ESP-IDF", "C", "Python", "SX1262", "GNSS", "ML-KEM/ML-DSA"],
    links: [
      { label: "View on GitHub", href: "https://github.com/alex05sim/CubeSat-telemetry-" },
    ],
    gallery: [{ src: "/pcb/layout-real.webp", fit: "contain", caption: "Real KiCad PCB layout — 2-layer board, hand-routed: 78 resistors, 69 caps, 24 ICs/modules across GNSS, LoRa, power/solar and the ESP32-S3 core." }],
    verification: "GitHub available",
    featured: true,
    icon: Satellite,
  },
  {
    slug: "orbital-mechanics-simulator",
    title: "Orbital Mechanics Simulator",
    domain: "AI",
    period: "Fall 2025",
    status: "GPU-accelerated engine",
    tagline: "An N-body gravitational simulator that runs on the GPU - and proves it stays accurate.",
    summary:
      "A GPU-accelerated N-body simulation engine with validation checks for energy conservation and numerical drift.",
    problem:
      "N-body gravitation scales badly - every body pulls on every other, so a naive simulation crawls as the system grows, and small integration errors quietly destroy physical accuracy over long runs.",
    approach: [
      "Built the simulation core around Verlet integration for stable, energy-preserving long-horizon dynamics.",
      "Accelerated the heavy per-step computation on the GPU with CuPy, reaching roughly a 40% speedup over the CPU baseline.",
      "Designed a validation framework using energy-conservation checks to catch numerical drift before it corrupts a run.",
      "Added 3D visualization so the system's behavior is inspectable, not just numeric.",
    ],
    role:
      "Built the simulation core, GPU acceleration path, validation checks, and visualization workflow.",
    proof: [
      {
        label: "Benchmark",
        detail: "Project page shows the CPU baseline against the GPU path and the claimed relative step-time improvement.",
      },
      {
        label: "Validation",
        detail: "Energy-conservation checks are called out as the correctness guard for the faster implementation.",
      },
      {
        label: "Artifact gap",
        detail: "A public repository or screenshot should be added when the simulator is ready to share.",
      },
    ],
    constraints: [
      "All-pairs force calculation grows quickly as body count increases.",
      "GPU speedups are only useful if numerical drift stays bounded.",
      "Visualization needs to make simulation behavior inspectable without becoming the core claim.",
    ],
    outcome:
      "Demonstrates a measured GPU path for N-body integration and a correctness-first validation loop.",
    nextSteps: [
      "Publish a short writeup with benchmark conditions.",
      "Add a real simulation screenshot or clip under public screenshots.",
      "Link a public repo or notebook when shareable.",
    ],
    artifactStatus: "planned",
    architecture: [
      { label: "Initial bodies", detail: "Mass, position, velocity" },
      { label: "CPU baseline", detail: "NumPy force calculation" },
      { label: "GPU path", detail: "CuPy all-pairs step" },
      { label: "Verlet integrator", detail: "Stable position update" },
      { label: "Validation", detail: "Energy drift checks" },
      { label: "3D view", detail: "Inspectable simulation output" },
    ],
    highlights: [
      { label: "Method", value: "Verlet integration" },
      { label: "Acceleration", value: "CuPy / GPU" },
      { label: "Speedup", value: "~40% over CPU" },
      { label: "Validation", value: "Energy conservation" },
    ],
    stack: ["Python", "CuPy", "NumPy", "VisPy", "CUDA"],
    links: [],
    verification: "Writeup available",
    featured: true,
    icon: Orbit,
    benchmark: {
      caption:
        "Moving the per-step force computation to the GPU with CuPy cut roughly 40% off the CPU baseline, while energy-conservation checks confirmed the faster path stayed physically accurate.",
      unit: "Relative time per integration step - shorter is faster",
      bars: [
        { name: "CPU - NumPy", value: 100, display: "1.00x" },
        { name: "GPU - CuPy", value: 60, display: "~0.6x", accent: true },
      ],
    },
  },
  {
    slug: "secure-file-storage",
    title: "Secure File Storage & Sharing",
    domain: "Security",
    period: "Spring 2026",
    status: "CS 161 - Project 2",
    tagline: "Zero-trust file system in Go - the server can be fully compromised and it still learns nothing.",
    summary:
      "A Berkeley CS 161 secure file system in Go that preserves confidentiality, integrity, sharing, revocation, and O(1) append bandwidth on a malicious datastore.",
    problem:
      "The spec's threat model is blunt: the datastore is fully compromised - an adversary can read, modify, and replay anything on disk. The system still has to guarantee confidentiality, integrity, authenticated sharing, cascading revocation, and O(1) append bandwidth. Go was the implementation language, which meant marshaling crypto keys to JSON, working with interface{} primitives, and keeping the 5-layer pointer chain consistent across sessions.",
    approach: [
      "Chose implicit authentication over a separate password verifier. Argon2 derives a 32-byte masterKey directly from credentials - if the password is wrong, the masterKey is wrong, and HMAC verification silently fails when unsealing the UserRecord. No extra round-trip to the datastore, no verifier an attacker can query. Getting this right in Go meant carefully sequencing the JSON unmarshal of PKE and DS private keys after decryption.",
      "Stored files as a 5-layer cryptographic pointer chain: User -> Access -> AccessNode -> FileMetadata -> 1024-byte FileBlocks, each AEAD-sealed under a per-file FileRootKey. The spec mandated O(1) append bandwidth, which forced the tail-pointer design - AppendToFile touches only the new block, the old tail, and the metadata header, regardless of file size.",
      "Sharing issues a sealed InviteEnvelope: an inviteRootKey encrypts the capability payload, the key is PKE-wrapped to the recipient's public key, and the whole envelope is signed with the sender's DS key so the recipient can verify origin. Each sharer gets an independent AccessNode in the capability tree - the key design decision that makes per-user revocation possible.",
      "Cascading revocation was the hardest part. If Alice shares with Bob who shares with Carol, revoking Bob must also cut Carol - the spec was explicit about this. The solution: BFS-collect the full downstream subtree from the ShareRecord, rotate FileRootKey and MetaUUID, rewrite every block under fresh material, update all surviving AccessNodes, and tombstone pending invites to prevent accept-after-revoke. Getting the share tree traversal correct without corrupting survivor access required careful sequencing.",
    ],
    role:
      "Designed and implemented the cryptographic data model, sharing capability tree, append path, and cascading revocation strategy in Go.",
    proof: [
      {
        label: "Private course project",
        detail: "Source is not public because this is a Berkeley CS 161 project, but the page documents the threat model and design decisions.",
      },
      {
        label: "Algorithmic evidence",
        detail: "Project page shows the O(1) append write pattern and revocation/key-rotation strategy.",
      },
      {
        label: "Security model",
        detail: "Design assumes the datastore can read, modify, and replay data while preserving confidentiality and integrity.",
      },
    ],
    constraints: [
      "Server/datastore is fully malicious.",
      "Append bandwidth must remain O(1).",
      "Sharing must be authenticated and revocation must cascade through downstream users.",
      "Course policy prevents publishing implementation source.",
    ],
    outcome:
      "Built a zero-trust file-sharing design with authenticated sharing, key rotation, cascading revocation, and constant-bandwidth append semantics.",
    nextSteps: [
      "Add a sanitized architecture diagram or design note that reveals no course-prohibited code.",
      "Add a short threat-model table for recruiter scanning.",
    ],
    artifactStatus: "private",
    architecture: [
      { label: "Credentials", detail: "Argon2 master key" },
      { label: "User record", detail: "Sealed identity and keys" },
      { label: "Access node", detail: "Per-user capability" },
      { label: "Metadata", detail: "File root and tail pointer" },
      { label: "File blocks", detail: "1024-byte AEAD chain" },
      { label: "Revocation", detail: "Rotate key and prune subtree" },
    ],
    highlights: [
      { label: "Course", value: "CS 161 - Berkeley" },
      { label: "Language", value: "Go" },
      { label: "Append cost", value: "O(1) writes" },
      { label: "Revocation", value: "Key rotation + BFS" },
    ],
    stack: ["Go", "Argon2", "PKE", "Digital signatures", "Encrypt-then-MAC", "AEAD"],
    links: [],
    verification: "Private course project",
    featured: true,
    icon: Binary,
    benchmark: {
      caption:
        "AppendToFile issues exactly 3 datastore writes - new block, old tail pointer update, metadata tail update - regardless of how many blocks the file has grown to.",
      unit: "Datastore writes per AppendToFile - 100-block baseline - fewer is better",
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
    tagline: "A generative model of the Sun's butterfly diagram - classical physics + diffusion.",
    summary:
      "Research with SwRI's IDEA Lab modeling the solar butterfly diagram: an interpretable classical model rebuilds a cycle's sunspot-latitude wing from its peak amplitude alone, and a score-based diffusion model learns the residual structure the smooth analytic form misses. The full write-up, with figures generated from the real catalog, is on this page.",
    problem:
      "Each ~11-year cycle, sunspots emerge at drifting latitudes that trace a noisy, only-roughly-periodic butterfly pattern. Reproducing that pattern faithfully - not just its smooth average - is a genuine generative-modeling problem.",
    approach: [
      "Aligned 14 cycles (~1880-today) of daily sunspot-group observations onto a shared cycle clock and fit a universal exponential mean path.",
      "Built the classical model: linear amplitude-to-shape laws that reconstruct a full 2-D wing from one number, re-deriving the Waldmeier effect from data.",
      "Cast what the classical fit misses as 15-bin residual histograms (222 windows) and built and numerically verified the diffusion forward process (cosine schedule, T = 200).",
    ],
    role:
      "Data alignment, classical model fitting, residual dataset construction, and the verified diffusion forward process.",
    proof: [
      {
        label: "Full write-up on this page",
        detail: "Complete methodology - classical model, residual dataset, diffusion forward process - with 11 figures generated from the composite sunspot catalog.",
      },
      {
        label: "Scoreboard",
        detail: "The classical baseline scores 3.093 nats/year mean negative log-likelihood; the diffusion model's job is to beat it.",
      },
    ],
    constraints: [
      "Sunspot data is noisy, hemisphere-asymmetric, and only approximately periodic.",
      "The classical model must stay interpretable - learned complexity belongs in the residual, not the physics.",
      "Code and data pipelines follow the lab's release policies.",
    ],
    outcome:
      "One amplitude number reconstructs a cycle's full 2-D wing, and the residual dataset plus forward process are numerically validated - a verified foundation for training the reverse process.",
    nextSteps: [
      "Train the diffusion reverse process (PyTorch + Lightning) and score it against the 3.093 nats/year classical baseline.",
      "Condition sampling on cycle amplitude to generate residuals for held-out cycles.",
    ],
    artifactStatus: "live",
    architecture: [
      { label: "Catalog", detail: "Daily sunspot groups, cycles 12-25" },
      { label: "Alignment", detail: "Shared cycle clock at the 15-degree crossing" },
      { label: "Classical model", detail: "Amplitude to wing shape" },
      { label: "Residuals", detail: "15-bin windows, 222 samples" },
      { label: "Diffusion", detail: "Forward verified; reverse in training" },
    ],
    highlights: [
      { label: "Context", value: "SwRI IDEA Lab" },
      { label: "Data", value: "Cycles 12-25 (~1880-today)" },
      { label: "Baseline", value: "3.093 nats/yr NLL" },
      { label: "Model", value: "Classical + diffusion" },
    ],
    stack: ["Python", "NumPy", "SciPy", "pandas", "Matplotlib", "PyTorch"],
    links: [],
    verification: "Full write-up + 11 figures on this page",
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
    period: "Aug 2023 - May 2024",
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
    org: "Computer Science Mentors - UC Berkeley",
    location: "Berkeley, CA",
    period: "Spring 2025 - Present",
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
    note: "Home base - coursework, research, and most of the building happens here.",
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
