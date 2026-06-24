"use client";

import { useState } from "react";

/**
 * A figure slot for the research report. Shows a styled placeholder until the
 * PNG exists in /public/research/ — the moment the file is added it loads and
 * replaces the placeholder, no code change needed.
 */
function ResearchFigure({
  src,
  label,
  caption,
  wide = false,
}: {
  src: string;
  label: string;
  caption: string;
  wide?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const file = src.split("/").pop();
  return (
    <figure className={`research-fig${wide ? " is-wide" : ""}`}>
      <div className="research-fig-frame">
        {!loaded ? (
          <div className="research-fig-ph" aria-hidden="true">
            <span className="research-fig-ph-label">{label}</span>
            <code className="research-fig-ph-file">{file}</code>
          </div>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={caption}
          className="research-fig-img"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          style={{ display: loaded ? "block" : "none" }}
        />
      </div>
      <figcaption>
        <strong>{label}</strong> — {caption}
      </figcaption>
    </figure>
  );
}

function SectionHead({ index, title }: { index: string; title: string }) {
  return (
    <div className="research-head-row">
      <span className="research-index">{index}</span>
      <h3 className="research-h">{title}</h3>
      <span className="research-rule" />
    </div>
  );
}

export function SolarResearch() {
  return (
    <section className="research detail-section mt-16" aria-label="Solar cycle research writeup">
      <div className="kicker-line">
        <p className="kicker">Research write-up // ButterflAI</p>
        <span className="rule" />
      </div>

      <h2 className="research-title">Reading the Sun’s Cycle</h2>
      <p className="research-sub">
        Modeling the solar butterfly diagram with a classical + diffusion hybrid · SwRI IDEA Lab
      </p>

      <div className="research-status">
        <span className="research-status-dot" aria-hidden="true" />
        <p>
          The classical generative model, the residual dataset, and the diffusion <em>forward</em> process
          are complete and verified. Training the diffusion <em>reverse</em> process and conditioning it on
          cycle amplitude are the next two milestones, in progress.
        </p>
      </div>

      {/* ── Overview ─────────────────────────────────────────────── */}
      <div className="research-section">
        <SectionHead index="01" title="Overview" />
        <div className="research-body">
          <p>
            Sunspots don’t appear at random latitudes. Early in an ~11-year solar cycle they emerge near
            ±30°; as the cycle ages they emerge closer and closer to the equator. Plot latitude against
            time and every cycle traces a pair of “wings” — the <strong>butterfly diagram</strong>. The
            catch: the pattern is noisy and only <em>roughly</em> periodic, so reproducing it well is a real
            modeling problem, not a curve fit.
          </p>
          <p>This project builds a generative model of the butterfly diagram in two complementary halves:</p>
          <div className="research-cards">
            <div className="research-card">
              <span>Classical model</span>
              <p>
                Interpretable and physically motivated. From a <em>single number</em> — a cycle’s amplitude —
                it reconstructs the smooth skeleton of that cycle’s wing.
              </p>
            </div>
            <div className="research-card">
              <span>Diffusion model</span>
              <p>
                A score-based model that learns what the classical fit can’t capture — bimodality, asymmetric
                tails, year-to-year wiggle — by generating the <em>residual</em>.
              </p>
            </div>
          </div>
          <p>
            The full model is <strong>classical model + sampled residual</strong>: the classical half gives
            interpretability, the diffusion half recovers everything the smooth analytic form leaves on the
            table. The data is a composite catalog of daily sunspot-group observations (latitude + corrected
            area); the modeling uses the well-calibrated modern era, <strong>cycles 12–25 (~1880 to today)</strong>.
            The scoreboard is a single metric — mean per-year negative log-likelihood (NLL) of the observed
            latitudes. The classical model scores <strong>3.093 nats/year</strong>; the diffusion model’s job
            is to beat it.
          </p>
        </div>
        <ResearchFigure
          src="/research/butterfly-diagram.png"
          label="Figure 1"
          caption="The butterfly diagram. Each point is a sunspot group, colored by cycle; emergence drifts equatorward as each cycle ages (Spörer’s Law)."
          wide
        />
      </div>

      {/* ── Classical model ──────────────────────────────────────── */}
      <div className="research-section">
        <SectionHead index="02" title="The classical model: a wing from one number" />
        <div className="research-body">
          <p>Built in five steps, each isolating one physical regularity and reducing the cycle to a few interpretable parameters.</p>
        </div>

        <div className="research-step">
          <span className="research-step-n">1</span>
          <div className="research-step-body">
            <h4>Put every cycle on a common clock (τ)</h4>
            <p>
              Cycles don’t start on the same date or last the same length. Each is anchored at the moment its
              yearly-mean latitude crosses <strong>15° on the way equatorward</strong> — reliably in the
              well-observed middle of every cycle — giving a shared coordinate τ = year − t₀.
            </p>
          </div>
        </div>

        <div className="research-step">
          <span className="research-step-n">2</span>
          <div className="research-step-body">
            <h4>A universal mean path μ(τ)</h4>
            <p>The mean emergence latitude decays exponentially as the cycle ages:</p>
            <div className="research-eq">μ(τ) = a · e^(−τ / b),&nbsp;&nbsp; a = 16.3°,&nbsp; b = 8.5 yr</div>
            <p>
              Fit once, globally, across all cycles — one curve describes the equatorward march of <em>every</em>{" "}
              cycle (b is the e-folding time: how long the mean takes to drop by a factor of e).
            </p>
            <ResearchFigure
              src="/research/universal-mean-path.png"
              label="Figure 2"
              caption="Aligned in τ, every cycle’s drift collapses onto a single exponential mean path (black)."
            />
          </div>
        </div>

        <div className="research-step">
          <span className="research-step-n">3</span>
          <div className="research-step-body">
            <h4>A universal envelope for the spread σ(μ)</h4>
            <p>
              How wide is the active band? It’s modeled against the current mean latitude μ (more physical
              than time) with a piecewise-linear envelope: the <strong>equatorward</strong> side is universal —
              the same line for every cycle, σ ≈ 0.443·μ − 0.15 — while the <strong>poleward</strong> side is
              cycle-specific. Fit quality: RMSE ≈ 0.9°.
            </p>
            <ResearchFigure
              src="/research/sigma-envelope.png"
              label="Figure 3"
              caption="Spread vs. mean latitude. The equatorward half of every cycle falls on one shared line (red dashed); only the poleward half varies."
            />
          </div>
        </div>

        <div className="research-step">
          <span className="research-step-n">4</span>
          <div className="research-step-body">
            <h4>Measure each cycle’s amplitude</h4>
            <p>
              A cycle’s strength is its peak <strong>total corrected sunspot area</strong> (MSH), computed per
              hemisphere and smoothed with a <strong>12-month window</strong> — wide enough to suppress the
              ~27-day rotation ripple, narrow enough to keep strong-vs-weak contrast.
            </p>
            <ResearchFigure
              src="/research/amplitude-peaks.png"
              label="Figure 4"
              caption="Smoothed hemispheric activity with each cycle’s detected peak. Cycle 19 (late 1950s) is the strongest on record; cycle 24 the weakest in a century."
              wide
            />
          </div>
        </div>

        <div className="research-step">
          <span className="research-step-n">5</span>
          <div className="research-step-body">
            <h4>Link amplitude to wing shape</h4>
            <p>The three shape parameters are approximately linear in amplitude:</p>
            <table className="research-table">
              <thead>
                <tr><th>Parameter</th><th>Meaning</th><th>Trend with amplitude</th></tr>
              </thead>
              <tbody>
                <tr><td>μ₀</td><td>starting (highest) latitude</td><td>↑ stronger cycles start higher — the Waldmeier effect</td></tr>
                <tr><td>μ_peak</td><td>detachment latitude</td><td>↑ stronger cycles stay broad longer</td></tr>
                <tr><td>m_i</td><td>poleward slope</td><td>varies with strength (peak shape)</td></tr>
              </tbody>
            </table>
            <ResearchFigure
              src="/research/shape-vs-amplitude.png"
              label="Figure 5"
              caption="Each shape parameter regressed against peak amplitude. The positive μ₀–amplitude slope is the Waldmeier effect, recovered directly from data."
              wide
            />
          </div>
        </div>

        <div className="research-body">
          <p>
            <strong>Putting it together:</strong> chaining steps 1–5, the model takes one input — a cycle’s
            amplitude — and emits a full 2-D butterfly wing (a Gaussian over latitude for each year). Overlaid
            on the real distributions, it shows exactly where a smooth model succeeds and where it falls short.
          </p>
        </div>
        <ResearchFigure
          src="/research/real-vs-synthetic.png"
          label="Figure 6"
          caption="Real per-year distributions (KDE) vs. the synthetic Gaussian wing predicted from amplitude alone. Close in the bulk — but the data show asymmetry and bumps a single Gaussian can’t reproduce. That gap is what the diffusion model targets."
          wide
        />
      </div>

      {/* ── Residual ─────────────────────────────────────────────── */}
      <div className="research-section">
        <SectionHead index="03" title="What the classical model misses → the residual" />
        <div className="research-body">
          <p>
            A single Gaussian per year is a strong assumption. The real distributions show bimodality,
            asymmetric tails, and year-to-year fluctuations no smooth form can follow. Instead of complicating
            the analytic model, the project models the leftover directly:
          </p>
          <div className="research-eq">residual = empirical histogram − parametric (Gaussian) histogram</div>
          <p>
            computed for each <strong>6-month window</strong> on a grid of <strong>15 latitude bins (3°, 0–45°)</strong>.
            Each residual is a single point in 15-dimensional space; after dropping sparse windows, the dataset
            is <strong>222 windows</strong>. The split is <strong>by hemispheric cycle</strong> (windows of one
            cycle aren’t independent) and <strong>stratified by amplitude</strong> — 15 cycles → 9 train / 3
            validation / 3 test, decisively small-data territory.
          </p>
        </div>
        <div className="research-fig-pair">
          <ResearchFigure
            src="/research/residual-sanity.png"
            label="Figure 7"
            caption="One window: empirical histogram (bars), the classical Gaussian (red), and their difference (green) — the structure the diffusion model learns to generate."
          />
          <ResearchFigure
            src="/research/amplitude-split.png"
            label="Figure 8"
            caption="Amplitude coverage of the three splits — stratification keeps each set representative."
          />
        </div>
      </div>

      {/* ── Diffusion ────────────────────────────────────────────── */}
      <div className="research-section">
        <SectionHead index="04" title="The diffusion model: learning the residual" />
        <div className="research-body">
          <p>
            A score-based diffusion model generates plausible residuals. It has a <strong>forward process</strong>{" "}
            that corrupts a real residual into pure Gaussian noise (purely numerical) and a{" "}
            <strong>reverse process</strong> that learns to undo it (a neural network). All the
            diffusion-specific math lives in the forward process, so it’s built and verified first. A clean
            residual r is mapped to any noise level t in one step:
          </p>
          <div className="research-eq">r_t = α_t · r + σ_t · ε,&nbsp;&nbsp; ε ~ 𝒩(0, I)</div>
          <p>
            using the <strong>variance-preserving cosine schedule</strong> (Nichol &amp; Dhariwal, 2021) with{" "}
            <strong>T = 200</strong> steps. The signal-to-noise ratio starts near-infinite, passes through 1 at
            t = 99, and falls to ~0 at t = T.
          </p>
        </div>
        <ResearchFigure
          src="/research/noise-schedule.png"
          label="Figure 9"
          caption="The cosine schedule. α (signal) and σ (noise) trade off smoothly; SNR (log axis) crosses 1 at the halfway point."
          wide
        />
        <ResearchFigure
          src="/research/forward-trajectory.png"
          label="Figure 10"
          caption="One residual corrupted at increasing noise levels — intact at low t, indistinguishable from white noise by t = T. Different random seeds agree at low noise and diverge at high noise: the process is stochastic."
          wide
        />
        <div className="research-body">
          <p>
            <strong>The key property, verified empirically:</strong> corrupt every training residual all the
            way to t = T and the result is statistically indistinguishable from a standard Gaussian — bin-wise
            mean ≈ 0, standard deviation ≈ 1, covariance ≈ the identity — <em>regardless of the original
            residual</em>. The endpoint forgets the input, which is exactly what lets the reverse process start
            sampling from pure 𝒩(0, I).
          </p>
        </div>
        <ResearchFigure
          src="/research/limiting-behavior.png"
          label="Figure 11"
          caption="At maximum noise the corrupted residuals collapse to 𝒩(0, I). The contrast with the structured statistics at t = 0 is what the reverse model must learn to reproduce, run backwards."
          wide
        />
        <div className="research-body">
          <p className="research-next-label">What’s next (in progress)</p>
          <ul className="research-list">
            <li>Train the reverse process (PyTorch + Lightning) to predict the noise and sample new residuals.</li>
            <li>Condition on (cycle amplitude, universal-path latitude) to generate residuals for held-out cycles.</li>
            <li>Combine the sampled residual with the classical model and re-score — target: beat 3.093 nats/year.</li>
          </ul>
        </div>
      </div>

      {/* ── Takeaways ────────────────────────────────────────────── */}
      <div className="research-section">
        <SectionHead index="05" title="Takeaways" />
        <div className="research-body">
          <ul className="research-list">
            <li>
              <strong>A single number reconstructs a solar cycle.</strong> The classical model rebuilds a full
              2-D butterfly wing from amplitude alone — and re-derives known solar physics from the data (the
              Waldmeier effect, a universal equatorward narrowing law).
            </li>
            <li>
              <strong>The hard part is modeled, not assumed away.</strong> The leftover structure is cast as a
              15-D residual and handed to a generative model rather than forced into a richer analytic form.
            </li>
            <li>
              <strong>The diffusion foundation is solid.</strong> The forward process is implemented in pure
              NumPy and numerically verified to converge to 𝒩(0, I), so the learned reverse process rests on
              correct math.
            </li>
          </ul>
          <p className="research-stack">
            <strong>Stack:</strong> Python · NumPy / SciPy · pandas · Matplotlib · PyTorch + Lightning
            (reverse-process training, in progress).
          </p>
        </div>
      </div>
    </section>
  );
}
