"""
Site-matched matplotlib style for the ButterflAI research figures.

Usage in the notebook:

    import figstyle
    fig, ax = plt.subplots(figsize=figstyle.FIGSIZE["wide"])
    ...
    figstyle.save(fig, "butterfly-diagram")   # -> public/research/butterfly-diagram.png

Colors are the site's design tokens, darkened to chart weight and validated
(colorblind separation + contrast) against the page background #05060c.
"""

from pathlib import Path

import matplotlib as mpl
from matplotlib.colors import LinearSegmentedColormap

# ---- palette (validated against #05060c) ---------------------------------
BG = "#05060c"        # page background - bake into the PNG so figures blend in
INK = "#aab2c6"       # axis labels        (site --muted)
INK_FAINT = "#7a8499" # tick labels        (site --muted-2)
TITLE = "#f3f5fb"     # in-plot annotations (site --foreground)
GRID = "#161a24"      # gridlines ~= site --line on BG
SPINE = "#252a38"

AMBER = "#d47c15"     # primary series: the model / headline curve
BLUE = "#4a7fe0"      # comparison series: data-vs-model, real-vs-synthetic
CYAN = "#0e9bb8"      # third series - if adjacent to BLUE, also dash it or label it directly
NEUTRAL = "#7a8499"   # context marks: observed scatter, reference lines

# Sequential colormap for density / heatmap panels (single hue, dark -> light)
CMAP_AMBER = LinearSegmentedColormap.from_list(
    "solar_amber", [BG, "#5c2d04", "#a35a0d", AMBER, "#ffb45e", "#ffe3bd"]
)

# ---- figure sizes matched to the page's placeholder slots ----------------
# (PNG aspect wins over the placeholder, so match it to keep the layout as designed)
FIGSIZE = {
    "wide": (12.8, 4.0),   # 16:5  - figures 1, 4, 5, 6, 9, 10, 11
    "default": (10.0, 5.0),  # 16:8  - figures 2, 3
    "pair": (8.0, 6.0),    # 4:3   - figures 7, 8 (rendered side by side)
}

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "research"

mpl.rcParams.update({
    "figure.facecolor": BG,
    "axes.facecolor": BG,
    "savefig.facecolor": BG,
    "text.color": INK,
    "axes.labelcolor": INK,
    "axes.titlecolor": TITLE,
    "xtick.color": INK_FAINT,
    "ytick.color": INK_FAINT,
    "axes.edgecolor": SPINE,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "grid.color": GRID,
    "grid.linewidth": 0.6,
    "axes.prop_cycle": mpl.cycler(color=[AMBER, BLUE, CYAN]),
    "lines.linewidth": 1.8,
    "font.size": 11,
    "axes.labelsize": 11,
    "xtick.labelsize": 9.5,
    "ytick.labelsize": 9.5,
    "legend.frameon": False,
    "legend.fontsize": 10,
})


def save(fig, name: str, dpi: int = 160) -> Path:
    """Save a figure into public/research/ with the site background baked in.

    `name` is the slot filename without extension, e.g. "butterfly-diagram".
    Titles/captions live in the page HTML - keep the PNG to axes + data only.
    """
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{name}.png"
    fig.savefig(out, dpi=dpi, facecolor=BG, bbox_inches="tight", pad_inches=0.25)
    return out
