"use client";

import { Fragment, type ReactNode } from "react";
import { Reveal } from "./portfolio/shared";

const KEYWORDS = new Set([
  "void", "if", "else", "for", "while", "return", "const", "static", "struct", "enum",
  "uint8_t", "uint16_t", "uint32_t", "int16_t", "int", "bool", "true", "false", "sizeof", "char",
  "float", "double", "unsigned", "long", "break", "continue", "switch", "case", "esp_err_t",
]);

/** Tiny dependency-free C/C++ tokenizer -> coloured spans, one line at a time. */
function highlightLine(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\/\/.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b0[xX][0-9a-fA-F]+\b|\b\d[\d.]*[fFuUlL]*\b)|(#\s*\w+)|([A-Za-z_]\w*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) out.push(<Fragment key={key++}>{line.slice(last, m.index)}</Fragment>);
    const [full, com, str, num, pre, ident] = m;
    if (com) out.push(<span key={key++} className="tk-com">{com}</span>);
    else if (str) out.push(<span key={key++} className="tk-str">{str}</span>);
    else if (num) out.push(<span key={key++} className="tk-num">{num}</span>);
    else if (pre) out.push(<span key={key++} className="tk-pre">{pre}</span>);
    else if (ident) {
      const after = line[m.index + full.length];
      if (KEYWORDS.has(ident)) out.push(<span key={key++} className="tk-key">{ident}</span>);
      else if (after === "(") out.push(<span key={key++} className="tk-fn">{ident}</span>);
      else out.push(<Fragment key={key++}>{ident}</Fragment>);
    }
    last = m.index + full.length;
  }
  if (last < line.length) out.push(<Fragment key={key++}>{line.slice(last)}</Fragment>);
  return out;
}

/** Reusable terminal-style, syntax-highlighted code card. */
export function CodeCard({
  kicker,
  title,
  lead,
  file,
  code,
}: {
  kicker: string;
  title: string;
  lead: string;
  file: string;
  code: string;
}) {
  const lines = code.split("\n");
  return (
    <Reveal className="pcb-code-wrap mt-16">
      <p className="kicker">{kicker}</p>
      <h2 className="display mt-3 text-3xl text-white sm:text-4xl">{title}</h2>
      <p className="lead mt-4 max-w-2xl">{lead}</p>
      <div className="pcb-code mt-6">
        <div className="pcb-code-bar" aria-hidden="true">
          <span className="pcb-code-dots">
            <i style={{ background: "#ff6b6b" }} />
            <i style={{ background: "#f6a23c" }} />
            <i style={{ background: "#7ee0a6" }} />
          </span>
          <span className="pcb-code-file">{file}</span>
        </div>
        <pre className="pcb-code-body">
          <code>
            {lines.map((ln, i) => (
              <span className="pcb-code-line" key={i}>
                <span className="pcb-code-ln">{i + 1}</span>
                <span className="pcb-code-tx">{highlightLine(ln)}</span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    </Reveal>
  );
}

// real telemetry send path - verbatim (lightly trimmed) from components/tasks/lora_task.c
const TELEMETRY = `// components/tasks/lora_task.c
static esp_err_t transmit_telemetry_from_fix(const gnss_fix_t *fix, bool bench_fix) {
  hope_packet_t pkt;
  uint8_t encoded[HOPE_MAX_PACKET_LEN];

  int16_t temp_c_x10 = 0;
  sensor_task_get_latest_temperature_c_x10(&temp_c_x10);
  cubesat_sensor_frame_t frame = { .gnss = *fix, .temperature_c_x10 = temp_c_x10 };

  telemetry_sample_t sample = {0};
  data_fusion_build_telemetry_sample(&frame, &sample);   // fuse GNSS + sensors
  telemetry_protocol_build(&sample, &pkt);               // v2 telemetry payload

  pkt.session_id = session_get_id();
  pkt.counter    = session_next_counter();               // strictly-increasing
  pkt.timestamp  = esp_timer_get_time() / 1000000ULL;
  pkt.src_id     = CUBESAT_NODE_ID;
  pkt.dst_id     = CUBESAT_GROUND_ID;

  int len = packet_encode(&pkt, encoded, sizeof encoded);                  // encode HOPE frame
  if (len <= 0) return ESP_FAIL;

  esp_err_t tx = packet_transport_send(encoded, len, LORA_TX_TIMEOUT_MS);  // SX1262 / Wi-Fi
  if (tx == ESP_OK) counter_store_save_tx(pkt.session_id, pkt.counter);    // persist to NVS
  return tx;
}`;

/** The firmware telemetry-loop code card. */
export function PcbFirmware() {
  return (
    <CodeCard
      kicker="Firmware - ESP-IDF"
      title="The telemetry loop."
      lead="One pass on the ESP32-S3: fuse GNSS and sensor data into a v2 telemetry sample, stamp it with a strictly-increasing per-session counter, encode the HOPE frame, and send it over the SX1262 - falling back to Wi-Fi UDP if the radio drops."
      file="lora_task.c"
      code={TELEMETRY}
    />
  );
}
