"""
Export the 11 ButterflAI research figures to public/research/, site-themed.

Transcribed from alex_notebook.ipynb (Week 07), with three kinds of changes:
  - data loading adapted to pandas 3.x and the local CSV (no Colab clone)
  - all styling replaced by figstyle (dark site theme, validated palette)
  - multi-figure cells consolidated into the single image each site slot expects

Run:  python export_figures.py   (from the research/ directory)
"""

from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.lines import Line2D
from scipy.stats import norm as sp_norm, gaussian_kde
from scipy.optimize import curve_fit, minimize_scalar, minimize

import figstyle
from figstyle import AMBER, BLUE, CYAN, NEUTRAL, TITLE, INK

RNG_SEED = 42

# ════════════════════════════════════════════════════════════════════════
# 1) Load data  (notebook cell 3, adapted: pandas 3.x removed parse_dates=[[...]])
# ════════════════════════════════════════════════════════════════════════
print("Loading data ...")
data_path = Path(__file__).parent / "composite_sunspot_groups_peak_area.csv"
df = pd.read_csv(data_path)
df["date"] = pd.to_datetime(df[["year", "month", "day"]])
df = df[df["latitude"].notna()].copy()

df["hemisphere"] = df["latitude"].apply(lambda v: "north" if v >= 0 else "south")
df["abs_latitude"] = df["latitude"].abs()
df["year"] = df["date"].dt.year
df["decimal_year"] = df["date"].dt.year + df["date"].dt.dayofyear / 365.25
df = df[df["correctedArea"] > 30].copy()

# ════════════════════════════════════════════════════════════════════════
# 2) τ alignment at the 15° crossing  (cell 6)
# ════════════════════════════════════════════════════════════════════════
t0_lookup = {}
for (cyc, hemi), group in df.groupby(["CYCLE", "hemisphere"]):
    yearly_mean = group.groupby("year")["abs_latitude"].mean().sort_index()
    years, means = yearly_mean.index.values, yearly_mean.values
    below = means < 15.0
    if not below.any() or below.all():
        continue
    idx1 = np.argmax(below)
    if idx1 == 0:
        continue
    y0, mu0 = years[idx1 - 1], means[idx1 - 1]
    y1, mu1 = years[idx1], means[idx1]
    t0_lookup[(cyc, hemi)] = y0 + (15.0 - mu0) / (mu1 - mu0)

df["t0"] = df.apply(lambda r: t0_lookup.get((r["CYCLE"], r["hemisphere"]), np.nan), axis=1)
df["tau"] = df["decimal_year"] - df["t0"]

# ════════════════════════════════════════════════════════════════════════
# 3) Universal mean path μ(τ) + refined t0  (cell 8)
# ════════════════════════════════════════════════════════════════════════
print("Fitting universal mean path ...")

def exp_decay(tau, a, b):
    return a * np.exp(-tau / b)

N_BINS_13 = 20
cycles_13 = [c for c in sorted(df["CYCLE"].dropna().unique()) if c >= 12]

all_tau_bins, all_mu_bins = [], []
hemicycle_bins_13 = {}
for cyc in cycles_13:
    for hemi in ["north", "south"]:
        if (cyc, hemi) not in t0_lookup:
            continue
        mask = (df["CYCLE"] == cyc) & (df["hemisphere"] == hemi) & df["tau"].notna()
        df_sel = df[mask]
        if len(df_sel) < 50:
            continue
        t_min, t_max = df_sel["tau"].min(), df_sel["tau"].max()
        bins = np.linspace(t_min, t_max, N_BINS_13 + 1)
        bin_centers = 0.5 * (bins[:-1] + bins[1:])
        bt, bm = [], []
        for i in range(N_BINS_13):
            lats_bin = df_sel.loc[
                (df_sel["tau"] >= bins[i]) & (df_sel["tau"] < bins[i + 1]),
                "abs_latitude"].values
            if len(lats_bin) < 10:
                continue
            mu_f, _ = sp_norm.fit(lats_bin)
            bt.append(bin_centers[i]); bm.append(mu_f)
        if len(bt) < 5:
            continue
        bt = np.array(bt); bm = np.array(bm)
        hemicycle_bins_13[(cyc, hemi)] = (bt, bm)
        all_tau_bins.extend(bt); all_mu_bins.extend(bm)

popt_global, _ = curve_fit(exp_decay, all_tau_bins, all_mu_bins, p0=[15.0, 5.0])
a_mu_univ, b_mu_univ = popt_global

t0_refined = {}
for (cyc, hemi), (bt, bm) in hemicycle_bins_13.items():
    def _res(dt, _bt=bt, _bm=bm):
        return np.sum((_bm - exp_decay(_bt - dt, a_mu_univ, b_mu_univ)) ** 2)
    res = minimize_scalar(_res, bounds=(-4, 4), method="bounded")
    t0_refined[(cyc, hemi)] = t0_lookup[(cyc, hemi)] + res.x

df["t0_refined"] = df.apply(lambda r: t0_refined.get((r["CYCLE"], r["hemisphere"]), np.nan), axis=1)
df["tau_refined"] = df["decimal_year"] - df["t0_refined"]

# ════════════════════════════════════════════════════════════════════════
# 4) σ(μ) split-normal fits  (cell 11)
# ════════════════════════════════════════════════════════════════════════
print("Fitting sigma envelope ...")

def split_normal_mu(mu, A, mu_peak, s_L, s_R):
    return np.where(
        mu >= mu_peak,
        A * np.exp(-0.5 * ((mu - mu_peak) / s_L) ** 2),
        A * np.exp(-0.5 * ((mu - mu_peak) / s_R) ** 2),
    )

N_BINS_15 = 20
results_15 = []
for cyc in cycles_13:
    for hemi in ["north", "south"]:
        if (cyc, hemi) not in t0_refined:
            continue
        mask = (df["CYCLE"] == cyc) & (df["hemisphere"] == hemi) & df["tau_refined"].notna()
        df_sel = df[mask]
        if len(df_sel) < 50:
            continue
        t_min, t_max = df_sel["tau_refined"].min(), df_sel["tau_refined"].max()
        bins = np.linspace(t_min, t_max, N_BINS_15 + 1)
        bin_centers = 0.5 * (bins[:-1] + bins[1:])
        bm_list, bs_list = [], []
        for i in range(N_BINS_15):
            lats_bin = df_sel.loc[
                (df_sel["tau_refined"] >= bins[i]) & (df_sel["tau_refined"] < bins[i + 1]),
                "abs_latitude"].values
            if len(lats_bin) < 10:
                continue
            mu_f, sigma_f = sp_norm.fit(lats_bin)
            bm_list.append(mu_f); bs_list.append(sigma_f)
        if len(bm_list) < 5:
            continue
        bm_arr = np.array(bm_list); bs_arr = np.array(bs_list)
        sidx = np.argsort(bm_arr)
        bm_arr, bs_arr = bm_arr[sidx], bs_arr[sidx]
        try:
            p0 = [bs_arr.max(), bm_arr[np.argmax(bs_arr)], 5.0, 4.0]
            popt, _ = curve_fit(split_normal_mu, bm_arr, bs_arr, p0=p0, maxfev=10_000)
            A_f, mu_peak_f, sL_f, sR_f = popt
        except RuntimeError:
            continue
        if not (0.5 < A_f < 20 and 2 < mu_peak_f < 38 and 0.5 < sL_f < 20 and 0.5 < sR_f < 20):
            continue
        results_15.append(dict(
            cycle=cyc, hemisphere=hemi,
            A=A_f, mu_peak=mu_peak_f, sL=sL_f, sR=sR_f,
            bin_mu=bm_arr, bin_sigma=bs_arr,
        ))

# ════════════════════════════════════════════════════════════════════════
# 5) Universal piecewise-linear envelope  (cell 13)
# ════════════════════════════════════════════════════════════════════════

def piecewise_linear_wing(mu, m_shared, b_shared, mu_peak, m_i):
    sigma_peak = m_shared * mu_peak + b_shared
    b_per = sigma_peak - m_i * mu_peak
    return np.clip(
        np.where(mu <= mu_peak, m_shared * mu + b_shared, m_i * mu + b_per),
        0.0, None,
    )

eq_mu, eq_sigma = [], []
for r in results_15:
    mask = r["bin_mu"] <= r["mu_peak"]
    eq_mu.extend(r["bin_mu"][mask]); eq_sigma.extend(r["bin_sigma"][mask])
m_init, b_init = np.polyfit(eq_mu, eq_sigma, 1)
m_i_init = np.mean([-r["A"] / (2 * max(r["sL"], 1.0)) for r in results_15])

n_hc = len(results_15)

def residuals_pl(x):
    m_sh, b_sh = x[0], x[1]
    return sum(
        np.sum((r["bin_sigma"] - piecewise_linear_wing(
            r["bin_mu"], m_sh, b_sh, x[2 + 2 * i], x[3 + 2 * i])) ** 2)
        for i, r in enumerate(results_15)
    )

x0 = np.array([m_init, b_init] + [val for r in results_15
                                  for val in (r["mu_peak"], m_i_init)])
bounds = list(zip(
    [0.0, -5.0] + [2.0, -5.0] * n_hc,
    [2.0, 5.0] + [38.0, 0.0] * n_hc,
))
opt = minimize(residuals_pl, x0, method="L-BFGS-B", bounds=bounds)
m_shared_fit, b_shared_fit = opt.x[0], opt.x[1]

MU_GRID_PL = np.linspace(2, 42, 300)
results_pl = []
for i, r in enumerate(results_15):
    mu_peak_i = opt.x[2 + 2 * i]
    m_i = opt.x[3 + 2 * i]
    results_pl.append(dict(
        cycle=r["cycle"], hemisphere=r["hemisphere"],
        m_shared=m_shared_fit, b_shared=b_shared_fit,
        mu_peak=mu_peak_i, m_i=m_i,
        sigma_curve=piecewise_linear_wing(
            MU_GRID_PL, m_shared_fit, b_shared_fit, mu_peak_i, m_i),
        bin_mu=r["bin_mu"], bin_sigma=r["bin_sigma"],
    ))

# ════════════════════════════════════════════════════════════════════════
# 6) Hemispheric activity + peaks  (cells 15/17, 12-month window only)
# ════════════════════════════════════════════════════════════════════════
print("Computing amplitudes and peaks ...")
df_amp = df[(df["CYCLE"] >= 12) & (df["correctedArea"] > 50)].copy()
daily_north = df_amp[df_amp["hemisphere"] == "north"].groupby("date")["correctedArea"].sum()
daily_south = df_amp[df_amp["hemisphere"] == "south"].groupby("date")["correctedArea"].sum()
date_range_17 = pd.date_range(
    min(daily_north.index.min(), daily_south.index.min()),
    max(daily_north.index.max(), daily_south.index.max()),
    freq="D",
)
daily_north = daily_north.reindex(date_range_17, fill_value=0)
daily_south = daily_south.reindex(date_range_17, fill_value=0)

WIN_18 = 365
smooth_north = daily_north.rolling(WIN_18, center=True, min_periods=WIN_18 // 3).mean()
smooth_south = daily_south.rolling(WIN_18, center=True, min_periods=WIN_18 // 3).mean()

peak_records = []
for cyc in cycles_13:
    cyc_dates = df[df["CYCLE"] == cyc]["date"]
    if len(cyc_dates) == 0:
        continue
    d_min, d_max = cyc_dates.min(), cyc_dates.max()
    for hemi, smooth in [("north", smooth_north), ("south", smooth_south)]:
        seg = smooth[(smooth.index >= d_min) & (smooth.index <= d_max)].dropna()
        if len(seg) == 0:
            continue
        peak_records.append(dict(
            cycle=int(cyc), hemisphere=hemi,
            peak_date=seg.idxmax(), peak_amplitude=float(seg.max()),
        ))
peaks_df = pd.DataFrame(peak_records).sort_values(["cycle", "hemisphere"]).reset_index(drop=True)
amp_lookup = {(row["cycle"], row["hemisphere"]): row["peak_amplitude"]
              for _, row in peaks_df.iterrows()}

# ════════════════════════════════════════════════════════════════════════
# 7) Shape parameters vs amplitude  (cell 19)
# ════════════════════════════════════════════════════════════════════════

def linear_fit(x, a, b):
    return a * x + b

records_19 = []
for r in results_pl:
    cyc, hemi = r["cycle"], r["hemisphere"]
    amp = amp_lookup.get((int(cyc), hemi))
    if amp is None or np.isnan(amp):
        continue
    mask = (df["CYCLE"] == cyc) & (df["hemisphere"] == hemi) & df["tau_refined"].notna()
    df_sel = df[mask]
    if len(df_sel) == 0:
        continue
    tau_start = df_sel["tau_refined"].min()
    mu0 = float(exp_decay(tau_start, a_mu_univ, b_mu_univ))
    records_19.append(dict(
        cycle=int(cyc), hemisphere=hemi,
        amplitude=float(amp), mu0=mu0,
        mu_peak=float(r["mu_peak"]), m_i=float(r["m_i"]),
    ))
df19 = pd.DataFrame(records_19)

fit_results_19 = {}
for col in ["mu0", "mu_peak", "m_i"]:
    vals = df19[["amplitude", col]].dropna()
    popt, _ = curve_fit(linear_fit, vals["amplitude"].values, vals[col].values,
                        p0=[0.0, float(vals[col].mean())])
    fit_results_19[col] = tuple(popt)

# ════════════════════════════════════════════════════════════════════════
# 8) Residual windows  (cell 28, fixed choice instead of random)
# ════════════════════════════════════════════════════════════════════════
print("Building residual windows ...")
from datetime import timedelta

LAT_BINS = np.linspace(0, 45, 16)
BIN_WIDTH = LAT_BINS[1] - LAT_BINS[0]
bin_centers15 = (LAT_BINS[:-1] + LAT_BINS[1:]) / 2

window_records = []
for cyc_num in cycles_13:
    for hemi in ["north", "south"]:
        if (cyc_num, hemi) not in t0_refined:
            continue
        amplitude = amp_lookup.get((int(cyc_num), hemi))
        if amplitude is None:
            continue
        pl = next((r for r in results_pl
                   if r["cycle"] == cyc_num and r["hemisphere"] == hemi), None)
        if pl is None:
            continue
        df_ch = df[(df["CYCLE"] == cyc_num) & (df["hemisphere"] == hemi)
                   & df["tau_refined"].notna()].copy()
        if df_ch.empty:
            continue
        start_date, end_date = df_ch["date"].min(), df_ch["date"].max()
        w = start_date.to_period("M").to_timestamp()
        while w <= end_date:
            w_end = (w + pd.DateOffset(months=6)) - timedelta(days=1)
            if w_end > end_date:
                w_end = end_date
            wdata = df_ch[(df_ch["date"] >= w) & (df_ch["date"] <= w_end)]
            if len(wdata) < 20:
                w += pd.DateOffset(months=6)
                continue
            w_center = w + (w_end - w) / 2
            dec_year = w_center.year + w_center.dayofyear / 365.25
            tau_center = dec_year - t0_refined[(cyc_num, hemi)]
            mu_universal = exp_decay(tau_center, a_mu_univ, b_mu_univ)
            hist_emp, _ = np.histogram(wdata["abs_latitude"].values,
                                       bins=LAT_BINS, density=True)
            sigma_t = piecewise_linear_wing(mu_universal, m_shared_fit, b_shared_fit,
                                            pl["mu_peak"], pl["m_i"])
            if sigma_t <= 0:
                w += pd.DateOffset(months=6)
                continue
            cdf_values = sp_norm.cdf(LAT_BINS, loc=mu_universal, scale=sigma_t)
            hist_par = np.diff(cdf_values) / BIN_WIDTH
            record = dict(cycle=cyc_num, hemisphere=hemi, amplitude=amplitude,
                          tau_center=tau_center, mu_universal=mu_universal)
            for i in range(len(hist_emp)):
                record[f"hist_emp_{i:02d}"] = hist_emp[i]
                record[f"hist_par_{i:02d}"] = hist_par[i]
                record[f"residual_{i:02d}"] = hist_emp[i] - hist_par[i]
            window_records.append(record)
            w += pd.DateOffset(months=6)

df_windows = pd.DataFrame(window_records)
print(f"  {len(df_windows)} residual windows")
residual_cols = [f"residual_{i:02d}" for i in range(15)]

# Train/val/test split by amplitude  (cell 31)
hemicycle_amplitudes = []
for (cyc, hemi), amp in amp_lookup.items():
    if ((df_windows["cycle"] == cyc) & (df_windows["hemisphere"] == hemi)).any():
        hemicycle_amplitudes.append(dict(cycle=int(cyc), hemisphere=hemi, amplitude=amp))
df_hemicycles = (pd.DataFrame(hemicycle_amplitudes)
                 .sort_values(by="amplitude", ascending=False).reset_index(drop=True))
indices = df_hemicycles.index.to_numpy()
test_indices = indices[::5]
remaining = np.setdiff1d(indices, test_indices)
val_indices = remaining[::5]
train_indices = np.setdiff1d(remaining, val_indices)
df_train = df_hemicycles.loc[train_indices]
df_val = df_hemicycles.loc[val_indices]
df_test = df_hemicycles.loc[test_indices]
train_cycles = [(r.cycle, r.hemisphere) for r in df_train.itertuples()]

# Noise schedule  (cell 33)
T = 200
s = 0.008
t_grid = np.arange(0, T + 1)
alpha_bar = (np.cos((t_grid / T + s) / (1 + s) * np.pi / 2) ** 2
             / np.cos(s / (1 + s) * np.pi / 2) ** 2)
alpha_s = np.sqrt(alpha_bar)
sigma_s = np.sqrt(1 - alpha_bar)
snr = alpha_bar / (1 - alpha_bar)
snr_1_idx = int(np.argmin(np.abs(snr - 1)))


def forward_corrupt(r, t, alpha, sigma, rng):
    eps = rng.normal(size=r.shape)
    return alpha[t] * r + sigma[t] * eps, eps


def forward_corrupt_batch(R, t_array, alpha, sigma, rng):
    EPS = rng.normal(size=R.shape)
    return alpha[t_array, None] * R + sigma[t_array, None] * EPS, EPS


# ════════════════════════════════════════════════════════════════════════
# FIGURES
# ════════════════════════════════════════════════════════════════════════
print("Rendering figures ...")

# ── Figure 1: butterfly diagram (wide) ──────────────────────────────────
fig, ax = plt.subplots(figsize=figstyle.FIGSIZE["wide"])
cycles_all = sorted(df["CYCLE"].dropna().unique())
for i, cyc in enumerate(cycles_all):
    d = df[df["CYCLE"] == cyc]
    ax.scatter(d["date"], d["latitude"], s=2.5, linewidths=0, alpha=0.5,
               color=AMBER if i % 2 == 0 else BLUE)
ax.axhline(0, color=NEUTRAL, linewidth=0.7, linestyle=":", alpha=0.6)
ax.set_ylim(-45, 45)
ax.set_xlabel("Date")
ax.set_ylabel("Latitude (°)")
print(" ", figstyle.save(fig, "butterfly-diagram"))
plt.close(fig)

# ── Figure 2: universal mean path (default) ─────────────────────────────
TAU_GRID_13 = np.linspace(-8, 8, 300)
fig, ax = plt.subplots(figsize=figstyle.FIGSIZE["default"])
for (cyc, hemi) in hemicycle_bins_13:
    mask = (df["CYCLE"] == cyc) & (df["hemisphere"] == hemi) & df["tau_refined"].notna()
    grp = df[mask]
    ax.scatter(grp["tau_refined"], grp["abs_latitude"], s=5, color=NEUTRAL,
               alpha=0.10, linewidths=0)
ax.plot(TAU_GRID_13, exp_decay(TAU_GRID_13, a_mu_univ, b_mu_univ),
        color=AMBER, linewidth=2.4,
        label=f"Universal μ(τ)   a = {a_mu_univ:.1f}°,  b = {b_mu_univ:.1f} yr")
ax.axvline(0, color=TITLE, linewidth=1.0, linestyle="--", alpha=0.55, label="τ = 0")
ax.axhline(15, color=NEUTRAL, linewidth=0.8, linestyle=":", alpha=0.6)
ax.set_xlabel("τ (years relative to refined t₀)")
ax.set_ylabel("|Latitude| (°)")
ax.set_ylim(0, 45); ax.set_xlim(-8, 8)
ax.legend(loc="upper right")
print(" ", figstyle.save(fig, "universal-mean-path"))
plt.close(fig)

# ── Figure 3: sigma envelope (default) ──────────────────────────────────
fig, ax = plt.subplots(figsize=figstyle.FIGSIZE["default"])
for r in results_pl:
    ax.scatter(r["bin_mu"], r["bin_sigma"], s=16, color=BLUE, alpha=0.45,
               linewidths=0, zorder=1)
    ax.plot(MU_GRID_PL, r["sigma_curve"], color=BLUE, linewidth=1.0,
            alpha=0.22, zorder=2)
mu_eq = np.linspace(0, max(r["mu_peak"] for r in results_pl) + 2, 200)
ax.plot(mu_eq, np.clip(m_shared_fit * mu_eq + b_shared_fit, 0, None),
        color=AMBER, linewidth=2.4, linestyle="--",
        label=f"Universal equatorward line   σ = {m_shared_fit:.3f}·μ {b_shared_fit:+.3f}",
        zorder=5)
ax.invert_xaxis()
ax.set_xlim(42, 2); ax.set_ylim(0, 12)
ax.set_xlabel("|μ| — mean emergence latitude (°)")
ax.set_ylabel("σ (°)")
ax.legend(loc="upper left")
print(" ", figstyle.save(fig, "sigma-envelope"))
plt.close(fig)

# ── Figure 4: hemispheric activity with peaks (wide) ────────────────────
fig, axes = plt.subplots(2, 1, figsize=(12.8, 5.6), sharex=True)
for ax, hemi, smooth, color in zip(
        axes, ["North", "South"], [smooth_north, smooth_south], [AMBER, BLUE]):
    ax.plot(smooth.index, smooth.values, color=color, linewidth=1.2, alpha=0.9)
    sub = peaks_df[peaks_df["hemisphere"] == hemi.lower()]
    ax.scatter(sub["peak_date"], sub["peak_amplitude"], s=26, color=TITLE, zorder=5)
    for _, row in sub.iterrows():
        ax.annotate(str(int(row["cycle"])),
                    (row["peak_date"], row["peak_amplitude"]),
                    textcoords="offset points", xytext=(4, 5),
                    fontsize=8, color=INK)
    ax.set_ylabel("Total area (MSH)")
    ax.text(0.006, 0.86, hemi, transform=ax.transAxes, fontsize=10,
            color=color, fontweight="bold")
axes[1].set_xlabel("Date")
print(" ", figstyle.save(fig, "amplitude-peaks"))
plt.close(fig)

# ── Figure 5: shape parameters vs amplitude (wide) ──────────────────────
param_info = [
    ("mu0", "μ₀ — earliest mean latitude (°)", AMBER),
    ("mu_peak", "μ_peak — detachment latitude (°)", BLUE),
    ("m_i", "mᵢ — poleward slope", CYAN),
]
fig, axes = plt.subplots(1, 3, figsize=(12.8, 4.4))
for ax, (col, ylabel, color) in zip(axes, param_info):
    vals = df19[["amplitude", col]].dropna()
    x, y = vals["amplitude"].values, vals[col].values
    a_fit, b_fit = fit_results_19[col]
    amp_grid = np.linspace(x.min() * 0.9, x.max() * 1.05, 200)
    ax.scatter(x, y, color=color, s=34, alpha=0.85, linewidths=0, zorder=3)
    ax.plot(amp_grid, linear_fit(amp_grid, a_fit, b_fit),
            color=TITLE, linewidth=1.5, linestyle="--", alpha=0.85,
            label=f"y = {a_fit:.5f}·A {b_fit:+.2f}")
    for _, row in df19.iterrows():
        if pd.notna(row["amplitude"]) and pd.notna(row[col]):
            ax.annotate(f"{int(row['cycle'])}{row['hemisphere'][0].upper()}",
                        (row["amplitude"], row[col]),
                        fontsize=5.5, alpha=0.5, xytext=(2, 2),
                        textcoords="offset points", color=INK)
    ax.set_xlabel("Peak amplitude (MSH)")
    ax.set_ylabel(ylabel)
    ax.legend(fontsize=8, loc="best")
print(" ", figstyle.save(fig, "shape-vs-amplitude"))
plt.close(fig)

# ── Figure 6: real KDE vs synthetic Gaussian, cycle 16 south (wide) ─────
cycle_number, hemisphere = 16, "south"
mask = (df["CYCLE"] == cycle_number) & (df["hemisphere"] == hemisphere)
df_cyc_hemi = df[mask].copy()
years_in_cycle = sorted(df_cyc_hemi["year"].unique())
lat_grid = np.linspace(-45, 0, 300)
kde_width_days = 250

amp_20 = amp_lookup[(cycle_number, hemisphere)]
mu0_pred = linear_fit(amp_20, *fit_results_19["mu0"])
mupeak_pred = linear_fit(amp_20, *fit_results_19["mu_peak"])
mi_pred = linear_fit(amp_20, *fit_results_19["m_i"])
t0_ref_20 = t0_refined[(cycle_number, hemisphere)]
year_ann = np.array(years_in_cycle)
tau_ann = (year_ann + 0.5) - t0_ref_20
mu_ann = exp_decay(tau_ann, a_mu_univ, b_mu_univ)
sigma_ann = np.array([
    piecewise_linear_wing(mu, m_shared_fit, b_shared_fit, mupeak_pred, mi_pred)
    for mu in mu_ann
])

fig, ax = plt.subplots(figsize=figstyle.FIGSIZE["wide"])
ax.scatter(df_cyc_hemi["date"], df_cyc_hemi["latitude"], s=2, color=NEUTRAL,
           alpha=0.18, linewidths=0, zorder=1)
for yr in years_in_cycle:
    yr_lats = df_cyc_hemi.loc[df_cyc_hemi["year"] == yr, "latitude"].values
    if len(yr_lats) < 5:
        continue
    kde_obj = gaussian_kde(yr_lats, bw_method=0.3)
    kde_vals = kde_obj(lat_grid)
    kde_sc = kde_vals / kde_vals.max() * kde_width_days
    center = pd.Timestamp(f"{int(yr)}-07-01")
    x_curve = [center + pd.Timedelta(days=float(v)) for v in kde_sc]
    ax.plot(x_curve, lat_grid, color=BLUE, linewidth=1.5, alpha=0.8, zorder=3)
    ax.fill_betweenx(lat_grid, [center] * len(lat_grid), x_curve,
                     color=BLUE, alpha=0.10, zorder=2)
for yr, mu, sg in zip(year_ann, mu_ann, sigma_ann):
    if sg <= 0:
        continue
    gauss_vals = sp_norm.pdf(lat_grid, loc=-mu, scale=sg)
    if gauss_vals.max() == 0:
        continue
    gauss_sc = gauss_vals / gauss_vals.max() * kde_width_days
    center = pd.Timestamp(f"{int(yr)}-07-01")
    x_curve = [center + pd.Timedelta(days=float(v)) for v in gauss_sc]
    ax.plot(x_curve, lat_grid, color=AMBER, linewidth=1.9, linestyle="--",
            alpha=0.95, zorder=5)
leg = [
    Line2D([0], [0], color=BLUE, linewidth=1.6, label="Real per-year KDE"),
    Line2D([0], [0], color=AMBER, linewidth=1.9, linestyle="--",
           label="Synthetic Gaussian (from amplitude alone)"),
    Line2D([0], [0], color=NEUTRAL, marker="o", markersize=4, linestyle="None",
           alpha=0.6, label="Observed sunspot groups"),
]
ax.legend(handles=leg, loc="lower right", fontsize=9)
ax.set_xlabel("Date")
ax.set_ylabel("Latitude (°)")
ax.set_ylim(-45, 0)
ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
ax.xaxis.set_major_locator(mdates.YearLocator())
print(" ", figstyle.save(fig, "real-vs-synthetic"))
plt.close(fig)

# ── Figure 7: residual sanity check (pair) ──────────────────────────────
win_idx = min(102, len(df_windows) - 1)
wrow = df_windows.iloc[win_idx]
hist_emp_plot = wrow[[f"hist_emp_{i:02d}" for i in range(15)]].values.astype(float)
hist_par_plot = wrow[[f"hist_par_{i:02d}" for i in range(15)]].values.astype(float)
residual_plot = wrow[residual_cols].values.astype(float)

fig, ax = plt.subplots(figsize=figstyle.FIGSIZE["pair"])
ax.bar(bin_centers15, hist_emp_plot, width=BIN_WIDTH * 0.8, alpha=0.55,
       color=BLUE, label="Empirical histogram")
ax.plot(bin_centers15, hist_par_plot, color=AMBER, linestyle="--", marker="o",
        markersize=4, linewidth=1.8, label="Classical Gaussian")
ax.plot(bin_centers15, residual_plot, color=CYAN, marker="x", markersize=5,
        linewidth=1.5, label="Residual (emp − par)")
ax.axhline(0, color=NEUTRAL, linewidth=0.7, linestyle=":", alpha=0.6)
ax.set_xlabel("|Latitude| (°)")
ax.set_ylabel("Density")
ax.legend(fontsize=9)
print(" ", figstyle.save(fig, "residual-sanity"))
plt.close(fig)

# ── Figure 8: amplitude split (pair) ────────────────────────────────────
fig, ax = plt.subplots(figsize=figstyle.FIGSIZE["pair"])
bins = np.linspace(df_hemicycles["amplitude"].min(),
                   df_hemicycles["amplitude"].max(), 20)
ax.hist(df_train["amplitude"], bins=bins, alpha=0.55, label="Train",
        color=AMBER, density=True)
ax.hist(df_val["amplitude"], bins=bins, alpha=0.55, label="Validation",
        color=BLUE, density=True)
ax.hist(df_test["amplitude"], bins=bins, alpha=0.55, label="Test",
        color=CYAN, density=True)
ax.set_xlabel("Peak amplitude (MSH)")
ax.set_ylabel("Density")
ax.legend(fontsize=9)
print(" ", figstyle.save(fig, "amplitude-split"))
plt.close(fig)

# ── Figure 9: cosine noise schedule (wide, two panels — no dual axis) ───
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12.8, 4.2))
ax1.plot(t_grid, alpha_s, color=AMBER, label="α_t  (signal)")
ax1.plot(t_grid, sigma_s, color=BLUE, label="σ_t  (noise)")
ax1.axvline(snr_1_idx, color=NEUTRAL, linestyle=":", linewidth=1.0,
            label=f"SNR = 1 at t = {snr_1_idx}")
ax1.set_xlabel("Timestep t")
ax1.set_ylabel("α_t  /  σ_t")
ax1.set_ylim(0, 1.05)
ax1.legend(fontsize=9)
ax2.plot(t_grid, snr, color=CYAN)
ax2.set_yscale("log")
ax2.axhline(1, color=NEUTRAL, linestyle=":", linewidth=1.0)
ax2.axvline(snr_1_idx, color=NEUTRAL, linestyle=":", linewidth=1.0)
ax2.set_ylim(1e-3, 1e5)
ax2.set_xlabel("Timestep t")
ax2.set_ylabel("SNR(t)")
ax2.annotate(f"SNR = 1 at t = {snr_1_idx}", (snr_1_idx, 1),
             textcoords="offset points", xytext=(8, 8), fontsize=9, color=INK)
print(" ", figstyle.save(fig, "noise-schedule"))
plt.close(fig)

# ── Figure 10: forward trajectory, two seeds (wide) ─────────────────────
clean_residual = df_windows.iloc[win_idx][residual_cols].values.astype(float)
t_steps = [0, T // 8, T // 4, T // 2, 3 * T // 4, T]
rows = [(42, AMBER), (123, BLUE)]

fig, axes = plt.subplots(2, 6, figsize=(12.8, 4.6), sharex=True, sharey=True)
ylims = []
data = {}
for seed, _ in rows:
    rng = np.random.default_rng(seed)
    data[seed] = [forward_corrupt(clean_residual, t, alpha_s, sigma_s, rng)[0]
                  for t in t_steps]
    ylims.extend(np.concatenate(data[seed]))
y_min, y_max = min(ylims) * 1.1, max(ylims) * 1.1
for ri, (seed, color) in enumerate(rows):
    for ci, t_step in enumerate(t_steps):
        ax = axes[ri, ci]
        ax.bar(bin_centers15, data[seed][ci], width=BIN_WIDTH * 0.8,
               alpha=0.8, color=color)
        ax.set_ylim(y_min, y_max)
        ax.axhline(0, color=NEUTRAL, linewidth=0.5, alpha=0.5)
        if ri == 0:
            snr_txt = "∞" if t_step == 0 else f"{snr[t_step]:.2f}"
            ax.set_title(f"t = {t_step}   SNR = {snr_txt}", fontsize=9)
        if ci == 0:
            ax.set_ylabel(f"seed {seed}", color=color)
        if ri == 1:
            ax.set_xlabel("|Lat| (°)", fontsize=8)
print(" ", figstyle.save(fig, "forward-trajectory"))
plt.close(fig)

# ── Figure 11: limiting behavior, t=0 vs t=T (wide grid) ────────────────
train_mask = df_windows.apply(
    lambda row: (row["cycle"], row["hemisphere"]) in train_cycles, axis=1)
clean_train = df_windows[train_mask][residual_cols].values.astype(float)
rng31 = np.random.default_rng(RNG_SEED)
r_T_batch, _ = forward_corrupt_batch(
    clean_train, np.full(len(clean_train), T, dtype=int), alpha_s, sigma_s, rng31)

cmap_div = LinearSegmentedColormap.from_list(
    "site_div", [BLUE, figstyle.BG, AMBER])

fig, axes = plt.subplots(2, 3, figsize=(12.8, 7.0))
for ri, (label, batch, color) in enumerate([
        ("t = 0 (clean)", clean_train, BLUE),
        ("t = T (fully corrupted)", r_T_batch, AMBER)]):
    mean_b = batch.mean(axis=0)
    std_b = batch.std(axis=0)
    cov_b = np.cov(batch, rowvar=False)
    axes[ri, 0].bar(bin_centers15, mean_b, width=BIN_WIDTH * 0.8, color=color, alpha=0.8)
    axes[ri, 0].axhline(0, color=NEUTRAL, linestyle="--", linewidth=0.9, alpha=0.8)
    axes[ri, 0].set_ylabel(f"{label}\nbin mean", fontsize=9)
    axes[ri, 1].bar(bin_centers15, std_b, width=BIN_WIDTH * 0.8, color=color, alpha=0.8)
    axes[ri, 1].axhline(1, color=NEUTRAL, linestyle="--", linewidth=0.9, alpha=0.8)
    axes[ri, 1].set_ylabel("bin std", fontsize=9)
    vmax = np.abs(cov_b).max()
    im = axes[ri, 2].imshow(cov_b, cmap=cmap_div, vmin=-vmax, vmax=vmax)
    axes[ri, 2].set_ylabel("bin index", fontsize=9)
    axes[ri, 2].grid(False)
    cb = fig.colorbar(im, ax=axes[ri, 2], fraction=0.046, pad=0.04)
    cb.set_label("covariance", fontsize=8)
for ci, ttl in enumerate(["Bin-wise mean", "Bin-wise std dev", "Covariance matrix"]):
    axes[0, ci].set_title(ttl, fontsize=10)
for ax in (axes[1, 0], axes[1, 1]):
    ax.set_xlabel("|Latitude| (°)", fontsize=9)
axes[1, 2].set_xlabel("bin index", fontsize=9)
print(" ", figstyle.save(fig, "limiting-behavior"))
plt.close(fig)

print("\nDone - all 11 figures exported.")
