"use client";

import { type CSSProperties } from "react";
import { Reveal } from "./portfolio/shared";
import { CodeCard } from "./pcb-firmware";

const STATUS = {
  ok: { label: "Working", cls: "is-ok" },
  gated: { label: "liboqs-gated", cls: "is-gated" },
  soon: { label: "Roadmap", cls: "is-soon" },
} as const;
type StatusKey = keyof typeof STATUS;

function Badge({ s }: { s: StatusKey }) {
  return <span className={`pcb-badge ${STATUS[s].cls}`}>{STATUS[s].label}</span>;
}

const THREATS: { a: string; d: string; s: StatusKey }[] = [
  { a: "Eavesdrop all LoRa traffic", d: "Per-session keys from ML-KEM; AEAD payload encryption", s: "soon" },
  { a: "Replay captured packets", d: "Strictly-increasing per-session counter", s: "ok" },
  { a: "Inject forged packets", d: "HMAC-SHA256 tag over header + payload", s: "ok" },
  { a: "MITM the handshake", d: "ML-DSA signatures bind the KEM key to a node identity", s: "gated" },
];

const LAYERS: { layer: string; prim: string; role: string; c: string; s: StatusKey }[] = [
  { layer: "Identity", prim: "ML-DSA", role: "signs the handshake — proves which node is talking", c: "178, 146, 255", s: "gated" },
  { layer: "Session", prim: "ML-KEM", role: "post-quantum key encapsulation → a fresh shared secret per session", c: "110, 160, 255", s: "gated" },
  { layer: "Transport", prim: "HMAC-SHA256", role: "keyed auth tag on every packet (AEAD encryption planned)", c: "126, 224, 166", s: "ok" },
  { layer: "Replay", prim: "counter window", role: "per-session counter rejects stale or duplicate packets", c: "255, 107, 107", s: "ok" },
];

const FIELDS = [
  { n: "ver", b: 1 },
  { n: "type", b: 1 },
  { n: "src", b: 2 },
  { n: "dst", b: 2 },
  { n: "session", b: 4 },
  { n: "counter", b: 4 },
  { n: "time", b: 4 },
  { n: "len", b: 2 },
];

const GROUPS: { s: StatusKey; items: string[] }[] = [
  { s: "ok", items: ["HMAC-SHA256 auth", "Strict replay counter", "SX1262 LoRa link", "GNSS NMEA v2", "Session + counter store", "C unit tests"] },
  { s: "gated", items: ["ML-KEM key exchange", "ML-DSA signatures", "PQ session handshake"] },
  { s: "soon", items: ["AEAD payload encryption", "ATECC608A key store", "BLE transport"] },
];

const CRYPTO_CODE = `// components/security/packet_crypto.c
// derive per-direction session keys from the ML-KEM shared secret
esp_err_t packet_crypto_derive_keys(const mlkem_session_t *session,
                                    packet_crypto_keys_t *keys) {
  if (session == NULL || keys == NULL || !session->established)
    return ESP_ERR_INVALID_ARG;

  static const uint8_t tx_label[] = "CubeSat LoRa TX key v1";
  static const uint8_t rx_label[] = "CubeSat LoRa RX key v1";
  memset(keys, 0, sizeof *keys);

  // HMAC-SHA256(shared_secret, label) -> direction key (domain-separated)
  ESP_RETURN_ON_ERROR(
    hmac_sha256(session->shared_secret, sizeof session->shared_secret,
                tx_label, sizeof tx_label - 1, NULL, 0,
                keys->tx_key, sizeof keys->tx_key),
    "packet_crypto", "tx key derivation failed");

  ESP_RETURN_ON_ERROR(
    hmac_sha256(session->shared_secret, sizeof session->shared_secret,
                rx_label, sizeof rx_label - 1, NULL, 0,
                keys->rx_key, sizeof keys->rx_key),
    "packet_crypto", "rx key derivation failed");

  keys->valid = true;
  return ESP_OK;
}`;

/** Security-architecture deep dive — designed PQ stack, with honest implementation status. */
export function PcbCrypto() {
  return (
    <>
      <Reveal className="pcb-crypto-head mt-16">
        <p className="kicker">Security architecture</p>
        <h2 className="display mt-3 text-3xl text-white sm:text-4xl">Post-quantum, by design.</h2>
        <p className="lead mt-4 max-w-2xl">
          The link is the threat surface: an attacker can hear every LoRa packet, replay it, or forge one.
          The crypto layer answers with a post-quantum design — and ships the parts that matter first.
        </p>
      </Reveal>

      {/* threat model → defenses */}
      <Reveal className="pcb-threat mt-8">
        <p className="pcb-sublabel">Threat model → defense</p>
        <div className="pcb-threat-grid mt-4">
          {THREATS.map((t) => (
            <div className="pcb-threat-row" key={t.a}>
              <span className="pcb-threat-a">{t.a}</span>
              <span className="pcb-threat-arrow" aria-hidden="true">→</span>
              <span className="pcb-threat-d">{t.d}</span>
              <Badge s={t.s} />
            </div>
          ))}
        </div>
      </Reveal>

      {/* layered crypto stack */}
      <Reveal className="pcb-layers-wrap mt-10">
        <p className="pcb-sublabel">The stack</p>
        <div className="pcb-layers mt-4">
          {LAYERS.map((l) => (
            <div className="pcb-layer" key={l.layer} style={{ "--n": l.c } as CSSProperties}>
              <span className="pcb-layer-name">{l.layer}</span>
              <span className="pcb-layer-prim">{l.prim}</span>
              <span className="pcb-layer-role">{l.role}</span>
              <Badge s={l.s} />
            </div>
          ))}
        </div>
      </Reveal>

      {/* 3-step authenticated handshake */}
      <Reveal className="pcb-hs-wrap mt-10">
        <p className="pcb-sublabel">Session handshake</p>
        <div className="pcb-hs mt-4">
          <svg viewBox="0 0 780 250" role="img" aria-label="Three-step authenticated handshake: HELLO with ephemeral ML-KEM public key and ML-DSA signature, KEM_REPLY with ciphertext and signature, SESSION_ACK confirmation.">
            <defs>
              <marker id="hsArrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="pcb-hs-head" />
              </marker>
            </defs>
            {/* lifelines + node boxes */}
            <line x1="130" y1="64" x2="130" y2="240" className="pcb-hs-life" />
            <line x1="650" y1="64" x2="650" y2="240" className="pcb-hs-life" />
            <g className="pcb-node" style={{ "--n": "246, 162, 60" } as CSSProperties}>
              <rect x="40" y="22" width="180" height="40" rx="9" className="pcb-node-box" />
              <text x="130" y="46" className="pcb-node-t">CubeSat · ESP32-S3</text>
            </g>
            <g className="pcb-node" style={{ "--n": "178, 146, 255" } as CSSProperties}>
              <rect x="560" y="22" width="180" height="40" rx="9" className="pcb-node-box" />
              <text x="650" y="46" className="pcb-node-t">Ground station</text>
            </g>
            {/* step 1: HELLO A → B */}
            <text x="390" y="100" className="pcb-hs-lbl">HELLO · ephemeral ML-KEM pk + ML-DSA sig</text>
            <line x1="130" y1="112" x2="650" y2="112" className="pcb-hs-line pcb-hs-1" markerEnd="url(#hsArrow)" />
            {/* step 2: KEM_REPLY B → A */}
            <text x="390" y="158" className="pcb-hs-lbl">KEM_REPLY · ciphertext + ML-DSA sig</text>
            <line x1="650" y1="170" x2="130" y2="170" className="pcb-hs-line pcb-hs-2" markerEnd="url(#hsArrow)" />
            {/* step 3: SESSION_ACK A → B */}
            <text x="390" y="216" className="pcb-hs-lbl">SESSION_ACK · confirm shared secret</text>
            <line x1="130" y1="228" x2="650" y2="228" className="pcb-hs-line pcb-hs-3" markerEnd="url(#hsArrow)" />
          </svg>
          <p className="pcb-hs-note">
            Each side verifies the other&apos;s ML-DSA signature before deriving traffic keys. <Badge s="gated" />
          </p>
        </div>
      </Reveal>

      {/* secure-packet anatomy */}
      <Reveal className="pcb-packet-wrap mt-10">
        <p className="pcb-sublabel">Secure packet</p>
        <div className="pcb-packet mt-4">
          <div className="pcb-packet-row">
            {FIELDS.map((f) => (
              <span className="pcb-packet-cell is-hdr" key={f.n} style={{ flexGrow: f.b } as CSSProperties}>
                <b>{f.n}</b>
                <i>{f.b}B</i>
              </span>
            ))}
            <span className="pcb-packet-cell is-pay" style={{ flexGrow: 12 } as CSSProperties}>
              <b>payload</b>
              <i>≤128 B</i>
            </span>
            <span className="pcb-packet-cell is-tag" style={{ flexGrow: 4 } as CSSProperties}>
              <b>HMAC tag</b>
              <i>SHA-256</i>
            </span>
          </div>
          <div className="pcb-packet-legend">
            <span><i className="pcb-leg is-hdr" />20-byte header — authenticated</span>
            <span><i className="pcb-leg is-pay" />payload — authenticated · <em>encryption = roadmap</em></span>
            <span><i className="pcb-leg is-tag" />HMAC-SHA256 tag — keyed from the session</span>
          </div>
        </div>
      </Reveal>

      {/* honest implementation status */}
      <Reveal className="pcb-status-wrap mt-10">
        <p className="pcb-sublabel">Implementation status</p>
        <div className="pcb-status-grid mt-4">
          {GROUPS.map((g) => (
            <div className="pcb-status-col" key={g.s}>
              <Badge s={g.s} />
              <ul className="pcb-status-list">
                {g.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Reveal>

      {/* the crypto code itself */}
      <CodeCard
        kicker="Crypto · packet_crypto.c"
        title="Keys from the shared secret."
        lead="After the ML-KEM handshake, both ends derive separate transmit and receive keys from the shared secret with domain-separated HMAC-SHA256 — so the two directions never share a key."
        file="packet_crypto.c"
        code={CRYPTO_CODE}
      />
    </>
  );
}
