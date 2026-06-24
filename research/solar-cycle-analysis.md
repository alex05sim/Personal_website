# Reading the Sun's Cycle
### Modeling the solar butterfly diagram with a classical + diffusion hybrid

**Alex Simpson · UC Berkeley · SwRI IDEA Lab (ButterflAI)**

> Status: the classical generative model, the residual dataset, and the diffusion **forward** process are complete and verified. Training the diffusion **reverse** process and conditioning it on cycle amplitude are in progress (the next two milestones).

---

## 1. Overview

Sunspots don't appear at random latitudes. Early in an ~11‑year solar cycle they emerge near ±30°; as the cycle ages they emerge closer and closer to the equator. Plot latitude against time and every cycle traces a pair of "wings" — the **butterfly diagram**. The catch: the pattern is noisy and only *roughly* periodic, so reproducing it well is a genuine modeling problem, not a curve fit.

This project builds a **generative model of the butterfly diagram** in two complementary halves:

1. **A classical statistical model** — interpretable and physically motivated. From a *single number* (a cycle's amplitude) it reconstructs the smooth skeleton of that cycle's wing: where spots start, how the active band drifts equatorward, and how wide it is at each step.
2. **A score‑based diffusion model** — learns the structure the classical model *can't* capture (bimodality, asymmetric tails, year‑to‑year wiggle) by generating the **residual** between the real data and the classical fit.

The full generative model is then **classical model + sampled residual**. The classical half gives interpretability; the diffusion half recovers everything the smooth analytic form leaves on the table.

**Data:** a composite catalog of daily sunspot‑group observations — date, heliographic latitude, and corrected area (in millionths of a solar hemisphere, MSH). The catalog reaches back ~200 years, but the modeling uses the well‑calibrated modern era, **cycles 12–25 (~1880 to today)**; earlier cycles come from heterogeneous sources with incompatible calibration and are excluded.

**Scoreboard:** a single global metric — the mean per‑year negative log‑likelihood (NLL) of the observed latitudes under the model. Lower is better. The classical model scores **3.093 nats/year**; the job of the diffusion model is to beat it.

![Butterfly diagram — sunspot latitude vs. time, each cycle a different color](/research/butterfly-diagram.png)
*Figure 1 — The butterfly diagram. Each point is a sunspot group; color marks the cycle. Within every cycle, emergence drifts from high latitude toward the equator (Spörer's Law).*

---

## 2. The classical model: a wing from one number

The classical model is built in five steps. Each step isolates one physical regularity and reduces the cycle to a few interpretable parameters.

### Step 1 — Put every cycle on a common clock (τ)

Cycles don't start on the same date or last the same length, so they can't be compared on a raw calendar axis. Each (cycle, hemisphere) is anchored at the moment its yearly‑mean emergence latitude crosses **15° on the way equatorward** — a point that lands reliably in the well‑observed middle of every cycle. The shifted coordinate **τ = year − t₀** (in years) places all cycles on the same footing. A refinement step then nudges each t₀ to best match the universal mean path (Step 2), using the full shape of the wing rather than a single crossing.

### Step 2 — A universal mean path μ(τ)

The mean emergence latitude decays roughly exponentially as the cycle ages:

> **μ(τ) = a · e^(−τ / b)**

Fit once, globally, by pooling all hemisphere‑cycles: **a = 16.3°**, **b = 8.5 yr** (the e‑folding time — how long the mean takes to drop by a factor of e). Remarkably, one curve describes the equatorward march of *every* cycle.

![All hemisphere-cycles aligned to the universal mean path](/research/universal-mean-path.png)
*Figure 2 — Once aligned in τ, every cycle's drift collapses onto a single exponential mean path (black). This universality is what lets one curve stand in for all cycles.*

### Step 3 — A universal envelope for the spread σ(μ)

How *wide* is the active band? Rather than tracking spread against time, it's modeled against the current **mean latitude μ** — more physical, since spread is set by the state of the dynamo, not the calendar. The width is bell‑shaped in μ‑space, captured by a **piecewise‑linear envelope**:

- the **equatorward** side (late cycle) is **universal** — the same line for every cycle: **σ ≈ 0.443·μ − 0.15**;
- the **poleward** side (early cycle) is **cycle‑specific** — stronger cycles detach at a higher latitude and descend more steeply.

So each wing's entire width profile needs only two universal numbers plus two per‑cycle numbers. Fit quality: RMSE ≈ 0.9° across all cycles.

![Universal piecewise-linear σ(μ) envelope](/research/sigma-envelope.png)
*Figure 3 — Spread vs. mean latitude. The equatorward half of every cycle falls on one shared line (red dashed); only the poleward half varies cycle to cycle.*

### Step 4 — Measure each cycle's amplitude

A cycle's strength is summarized by its peak **total corrected sunspot area** (MSH), computed per hemisphere and smoothed with a **12‑month rolling window** — wide enough to suppress the ~27‑day solar‑rotation ripple, narrow enough to preserve the contrast between strong and weak cycles. The peak of that smoothed curve is the cycle's amplitude.

![12-month smoothed sunspot area with detected cycle peaks](/research/amplitude-peaks.png)
*Figure 4 — Smoothed hemispheric activity with each cycle's detected peak. Cycle 19 (late 1950s) is the strongest on record; cycle 24 the weakest in a century — both fall out cleanly.*

### Step 5 — Link amplitude to wing shape

With amplitude in hand, the three shape parameters turn out to be (approximately) **linear in amplitude**:

| Parameter | Meaning | Trend with amplitude |
|---|---|---|
| μ₀ | starting (highest) latitude | ↑ stronger cycles start higher — the **Waldmeier effect** |
| μ_peak | detachment latitude | ↑ stronger cycles stay broad longer |
| m_i | poleward slope | varies with strength (peak shape) |

![Wing shape parameters vs. cycle amplitude](/research/shape-vs-amplitude.png)
*Figure 5 — Each shape parameter regressed against peak amplitude. The positive μ₀–amplitude slope is the Waldmeier effect, recovered directly from the data.*

### Putting it together: synthesize a wing from amplitude alone

Chaining Steps 1–5, the model takes **one input — a cycle's amplitude — and emits a full 2‑D butterfly wing**: a Gaussian over latitude for each year, centered on μ(τ) with width σ(μ). Overlaying that synthetic wing on the real per‑year distributions shows where the smooth model succeeds and where it falls short.

![Real per-year distributions vs. synthetic Gaussian wing](/research/real-vs-synthetic.png)
*Figure 6 — Real latitude distributions (KDE) vs. the synthetic Gaussian wing predicted from amplitude alone. Close in the bulk — but the real data show asymmetry and bumps a single Gaussian can't reproduce. That gap is exactly what the diffusion model targets.*

This classical model is the **baseline**: global NLL = **3.093 nats/year**.

---

## 3. What the classical model misses → the residual

A single Gaussian per year is a strong assumption. The real distributions show **bimodality at some phases, asymmetric tails, and year‑to‑year fluctuations** that no smooth analytic form can follow. Instead of complicating the analytic model, the project models the leftover directly.

For each **6‑month window** of each hemispheric cycle, compute:

> **residual = empirical latitude histogram − parametric (Gaussian) histogram**

both as densities on a shared grid of **15 latitude bins (3° wide, 0–45°)**. Each residual is therefore a single point in **15‑dimensional space**. Windows with fewer than 20 observed groups are dropped; the result is a clean table of **222 windows**.

![Empirical vs. parametric histogram and their residual](/research/residual-sanity.png)
*Figure 7 — One window: the empirical histogram (bars), the classical model's Gaussian (red), and their difference (green). The green curve — the structure the classical model misses — is what the diffusion model learns to generate.*

**Stratified split.** Splitting is done **by hemispheric cycle, not by row** (two windows of the same cycle aren't independent — they share an amplitude and physics), and **stratified by amplitude** so every split spans strong and weak cycles. With 15 hemispheric cycles available this yields **9 train / 3 validation / 3 test** — decisively small‑data territory, which shapes the modeling choices.

![Amplitude distribution across train / validation / test](/research/amplitude-split.png)
*Figure 8 — Amplitude coverage of the three splits. Stratification keeps each set representative rather than landing all the weak cycles in one bin.*

---

## 4. The diffusion model: learning the residual

A score‑based **diffusion model** generates plausible residuals. It has two halves:

- a **forward process** that progressively corrupts a real residual into pure Gaussian noise — purely numerical, no learning;
- a **reverse process** that learns to undo the corruption — a neural network.

All the diffusion‑specific mathematics lives in the forward process, so it's built and verified first (this is the completed Week‑07 milestone); the reverse process is then a standard regression problem.

### The forward process (complete & verified)

A clean residual **r** is mapped to any noise level *t* in one step:

> **rₜ = αₜ · r + σₜ · ε,  ε ~ 𝒩(0, I)**

The schedule (αₜ, σₜ) is the **cosine schedule** of Nichol & Dhariwal (2021), which is **variance‑preserving** (αₜ² + σₜ² = 1 at every step), with **T = 200** timesteps. The signal‑to‑noise ratio SNR(t) = αₜ²/σₜ² starts near‑infinite (pure signal), passes through **1 at t = 99**, and falls to ~0 at t = T (pure noise).

![Cosine noise schedule — α, σ and SNR](/research/noise-schedule.png)
*Figure 9 — The variance‑preserving cosine schedule. α (signal) and σ (noise) trade off smoothly; SNR (log axis) crosses 1 at the halfway point.*

Applying the schedule across timesteps to a single residual shows it dissolve into noise — the conceptual anchor of the whole method:

![A residual dissolving into noise across the forward process](/research/forward-trajectory.png)
*Figure 10 — One residual corrupted at increasing noise levels. At low t the structure is intact; by t = T it's indistinguishable from white noise. Re‑running with a different random seed shows the trajectories agree at low noise and diverge at high noise — the process is stochastic.*

**The key property, verified empirically:** corrupt *every* training residual all the way to t = T and the result is statistically indistinguishable from a standard Gaussian — **bin‑wise mean ≈ 0, standard deviation ≈ 1, covariance ≈ the identity matrix** — *regardless of the original residual*. The endpoint forgets the input. That's precisely what lets the reverse process start sampling from pure 𝒩(0, I) with no learning at the first step.

![Limiting behavior at t = T: mean ≈ 0, std ≈ 1, covariance ≈ identity](/research/limiting-behavior.png)
*Figure 11 — At maximum noise the corrupted residuals collapse to 𝒩(0, I). The contrast between this and the structured statistics at t = 0 is exactly what the reverse model must learn to reproduce, run backwards.*

### What's next (in progress)

- **Train the reverse process** (PyTorch + Lightning): a network that predicts the noise ε from rₜ, learning the marginal distribution of residuals, then sampling new ones that match the training distribution.
- **Condition** on (cycle amplitude, universal‑path latitude) so residuals can be generated for held‑out cycles.
- **Combine** the sampled residual with the classical model and re‑score with the global NLL — the target is to beat the **3.093 nats/year** baseline.

---

## 5. Takeaways

- **A single number reconstructs a solar cycle.** The classical model recovers a full 2‑D butterfly wing from cycle amplitude alone, and in doing so re‑derives known solar physics from the data — the Waldmeier effect and a universal equatorward narrowing law.
- **The hard part is modeled, not assumed away.** Rather than forcing a richer analytic form, the leftover structure is cast as a 15‑D residual and handed to a generative model.
- **The diffusion foundation is solid.** The forward process is implemented in pure NumPy and numerically verified to converge to 𝒩(0, I), so the learned reverse process rests on correct math.

**Stack:** Python · NumPy / SciPy (classical model + forward diffusion) · pandas (catalog wrangling) · Matplotlib (all figures) · PyTorch + Lightning (reverse‑process training, in progress). Data: daily sunspot observations, cycles 12–25 (~1880–2023).

---

### Figure export checklist

To render this report on the site with the real plots, export these from the notebook as PNGs into `public/research/` (≈150 dpi, tight bounding box):

| File | Notebook figure |
|---|---|
| `butterfly-diagram.png` | full butterfly diagram (all cycles, colored) |
| `universal-mean-path.png` | hemisphere‑cycles aligned to μ(τ) |
| `sigma-envelope.png` | universal piecewise‑linear σ(μ) envelope |
| `amplitude-peaks.png` | 12‑month smoothed area with detected peaks |
| `shape-vs-amplitude.png` | μ₀ / μ_peak / m_i vs. amplitude (3‑panel) |
| `real-vs-synthetic.png` | real KDE vs. synthetic Gaussian wing |
| `residual-sanity.png` | empirical vs. parametric histogram + residual |
| `amplitude-split.png` | amplitude distribution of train/val/test |
| `noise-schedule.png` | cosine schedule α / σ / SNR |
| `forward-trajectory.png` | residual dissolving into noise (grid) |
| `limiting-behavior.png` | mean / std / covariance at t = T |

In the notebook, each plot's `fig` can be saved with:
```python
fig.savefig("public/research/<name>.png", dpi=150, bbox_inches="tight")
```
