#!/usr/bin/env python3
"""
Generate SciPy/NumPy reference fixtures for src/lib/stats.

    python scripts/gen-fixtures.py

Writes tests/fixtures/*.json. Requires numpy + scipy (tested with NumPy 2.4, SciPy 1.18).
Every number is emitted at full double precision (repr). Inputs are chosen to avoid exact
discrete-cdf boundaries for quantile cases (where two implementations may legitimately differ).

Fixture files
  special.json        erf, erfc, gammaln, gammainc, gammaincc, betainc, comb
  distributions.json  normal, t, chi2, f, binom, geom, poisson, uniform, expon: pdf/pmf, cdf, sf, ppf
  descriptive.json    mean, median, var/std (ddof=1 and 0), percentile (linear), skew (bias=False), quartiles
  regression.json     linregress + residual s, leverage, Cook's D, transformed fits
  inference.json      ttest_1samp / ttest_rel / ttest_ind(equal_var=False) + t.interval; proportion z procedures
                      (manual formulas); chisquare; chi2_contingency(correction=False); power & sample size
"""
from __future__ import annotations

import json
import math
import os
import sys

import numpy as np
from scipy import special, stats

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "tests", "fixtures")
os.makedirs(OUT, exist_ok=True)


def dump(name: str, data) -> None:
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=1, allow_nan=True)
    print(f"wrote {os.path.relpath(path)}")


def num(x):
    """Coerce numpy scalars to Python floats/ints; keep inf/nan (encoded as strings)."""
    if isinstance(x, (np.integer,)):
        return int(x)
    if isinstance(x, (np.floating, float)):
        x = float(x)
        if math.isinf(x):
            return "Infinity" if x > 0 else "-Infinity"
        if math.isnan(x):
            return "NaN"
        return x
    return x


# ─── special ────────────────────────────────────────────────────────────────────────────────────
def gen_special():
    xs = [-8, -5, -3, -2.5, -2, -1.5, -1, -0.75, -0.5, -0.46875, -0.4, -0.25, -0.1, -0.01, -1e-6, 0, 1e-6, 0.01, 0.1, 0.25,
          0.4, 0.46875, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 8, 10, 15, 20, 25, 26]
    erf = [{"x": x, "erf": num(special.erf(x)), "erfc": num(special.erfc(x))} for x in xs]
    gxs = [0.001, 0.01, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4.5, 7.5, 10, 10.5, 25, 50.5, 100, 170.5, 500, 1000, 1e4, 1e5]
    gammaln = [{"x": x, "lgamma": num(special.gammaln(x))} for x in gxs]
    inc = []
    for a in [0.5, 1, 1.5, 2, 2.5, 5, 10, 25, 50, 100, 500]:
        for x in [0, 0.01, 0.1, 0.5, 1, 2, 3, 5, 8, 10, 15, 20, 30, 50, 60, 100, 150, 400, 500, 600, 1000]:
            inc.append({"a": a, "x": x, "P": num(special.gammainc(a, x)), "Q": num(special.gammaincc(a, x))})
    beta = []
    for (a, b) in [(0.5, 0.5), (1, 1), (2, 3), (0.5, 5), (5, 0.5), (10, 10), (0.5, 50), (50, 0.5), (100, 100), (1000, 0.5), (0.5, 1000), (2000, 2000)]:
        for x in [0, 1e-6, 0.001, 0.01, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 0.99, 0.999, 1]:
            beta.append({"x": x, "a": a, "b": b, "I": num(special.betainc(a, b, x))})
    comb = [{"n": n, "k": k, "value": num(special.comb(n, k, exact=True))} for (n, k) in
            [(0, 0), (5, 2), (10, 3), (20, 10), (50, 25), (52, 5), (60, 30), (100, 3), (100, 50), (200, 100), (1000, 500)]]
    dump("special.json", {"erf": erf, "gammaln": gammaln, "gammainc": inc, "betainc": beta, "comb": comb})


# ─── distributions ──────────────────────────────────────────────────────────────────────────────
PS = [1e-9, 1e-6, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.975, 0.99, 0.995, 0.999, 1 - 1e-6]


def gen_distributions():
    d = {}
    # normal
    normal = []
    for (mu, s) in [(0, 1), (65, 3.5), (-2, 0.25), (1000, 150)]:
        dist = stats.norm(mu, s)
        for z in [-40, -37, -10, -6, -3.5, -3, -2.5, -2, -1.96, -1.5, -1, -0.5, -0.25, 0, 0.25, 0.5, 1, 1.5, 1.96, 2, 2.5, 3, 3.5, 6, 10, 37, 40]:
            x = mu + s * z
            normal.append({"mu": mu, "sigma": s, "x": x, "pdf": num(dist.pdf(x)), "cdf": num(dist.cdf(x)), "sf": num(dist.sf(x))})
        for p in PS:
            normal.append({"mu": mu, "sigma": s, "p": p, "ppf": num(dist.ppf(p))})
    d["normal"] = normal
    # t
    tt = []
    for df in [1, 2, 2.7, 3, 4, 5, 9, 10, 14, 15, 19.4321, 24, 29, 30, 40, 60, 100, 120, 500, 1000, 5000, 1e6]:
        dist = stats.t(df)
        for x in [-20, -10, -5, -3.5, -3, -2.5, -2.131, -2, -1.5, -1, -0.5, -0.1, 0, 0.1, 0.5, 1, 1.5, 2, 2.131, 2.5, 3, 3.5, 5, 10, 20, 50]:
            tt.append({"df": df, "x": x, "pdf": num(dist.pdf(x)), "cdf": num(dist.cdf(x)), "sf": num(dist.sf(x))})
        for p in PS:
            tt.append({"df": df, "p": p, "ppf": num(dist.ppf(p))})
    d["t"] = tt
    # chi2
    c2 = []
    for df in [1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 20, 24, 30, 50, 100, 200, 1000]:
        dist = stats.chi2(df)
        for x in [0, 0.001, 0.01, 0.1, 0.5, 1, 2, 3, 3.84, 5, 7.81, 10, 15, 20, 30, 50, 75, 100, 150, 250, 500, 1000, 1200]:
            c2.append({"df": df, "x": x, "pdf": num(dist.pdf(x)), "cdf": num(dist.cdf(x)), "sf": num(dist.sf(x))})
        for p in PS:
            c2.append({"df": df, "p": p, "ppf": num(dist.ppf(p)), "isf": num(dist.isf(p))})
    d["chi2"] = c2
    # F
    ff = []
    for (d1, d2) in [(1, 1), (1, 18), (2, 10), (3, 10), (5, 5), (10, 20), (20, 5), (1, 100), (30, 30)]:
        dist = stats.f(d1, d2)
        for x in [0, 0.1, 0.5, 1, 1.5, 2, 3, 4.2, 5, 10, 25, 100]:
            ff.append({"d1": d1, "d2": d2, "x": x, "pdf": num(dist.pdf(x)), "cdf": num(dist.cdf(x)), "sf": num(dist.sf(x))})
        for p in [0.01, 0.05, 0.1, 0.5, 0.9, 0.95, 0.99]:
            ff.append({"d1": d1, "d2": d2, "p": p, "ppf": num(dist.ppf(p))})
    d["f"] = ff
    # binomial
    bn = []
    for (n, p) in [(0, 0.3), (1, 0.5), (5, 0.5), (10, 0.3), (10, 0.5), (12, 0.9), (20, 0.05), (25, 0.65), (30, 0.1), (50, 0.5), (100, 0.02), (100, 0.5), (200, 0.3), (1000, 0.5), (1000, 0.001), (10, 0), (10, 1)]:
        dist = stats.binom(n, p)
        ks = sorted(set([-1, 0, 1, 2, 3, 5, n // 4, n // 2, n - 2, n - 1, n, n + 1]))
        for k in ks:
            bn.append({"n": n, "p": p, "k": k, "pmf": num(dist.pmf(k)), "cdf": num(dist.cdf(k)), "sf": num(dist.sf(k))})
        if 0 < p < 1:
            for q in [0.001, 0.013, 0.05, 0.1, 0.27, 0.5, 0.73, 0.9, 0.95, 0.987, 0.999]:
                bn.append({"n": n, "p": p, "q": q, "ppf": num(dist.ppf(q))})
    d["binomial"] = bn
    # geometric (AP support 1, 2, 3, …)
    ge = []
    for p in [0.01, 0.1, 0.2, 0.25, 0.5, 0.8, 0.95, 1.0]:
        dist = stats.geom(p)
        for k in [0, 1, 2, 3, 4, 5, 8, 10, 20, 50, 100]:
            ge.append({"p": p, "k": k, "pmf": num(dist.pmf(k)), "cdf": num(dist.cdf(k)), "sf": num(dist.sf(k))})
        if p < 1:
            for q in [0.013, 0.1, 0.27, 0.5, 0.73, 0.9, 0.987]:
                ge.append({"p": p, "q": q, "ppf": num(dist.ppf(q))})
    d["geometric"] = ge
    # poisson
    po = []
    for lam in [0.1, 0.5, 1, 2.5, 3.5, 7, 12, 25, 100, 1000]:
        dist = stats.poisson(lam)
        for k in [0, 1, 2, 3, 5, 8, 10, 20, 30, 90, 110, 1000, 1100]:
            po.append({"lambda": lam, "k": k, "pmf": num(dist.pmf(k)), "cdf": num(dist.cdf(k)), "sf": num(dist.sf(k))})
        for q in [0.013, 0.1, 0.27, 0.5, 0.73, 0.9, 0.987]:
            po.append({"lambda": lam, "q": q, "ppf": num(dist.ppf(q))})
    d["poisson"] = po
    # uniform, exponential
    un = []
    for (a, b) in [(0, 1), (2, 8), (-3, 3)]:
        dist = stats.uniform(a, b - a)
        for x in [a - 1, a, a + 0.25 * (b - a), (a + b) / 2, b, b + 1]:
            un.append({"a": a, "b": b, "x": x, "pdf": num(dist.pdf(x)), "cdf": num(dist.cdf(x))})
        for q in [0, 0.1, 0.5, 0.9, 1]:
            un.append({"a": a, "b": b, "q": q, "ppf": num(dist.ppf(q))})
    d["uniform"] = un
    ex = []
    for rate in [0.25, 0.5, 1, 2, 10]:
        dist = stats.expon(scale=1 / rate)
        for x in [-1, 0, 0.1, 0.5, 1, 2, 5, 10, 50]:
            ex.append({"rate": rate, "x": x, "pdf": num(dist.pdf(x)), "cdf": num(dist.cdf(x)), "sf": num(dist.sf(x))})
        for q in [0.001, 0.1, 0.5, 0.9, 0.999]:
            ex.append({"rate": rate, "q": q, "ppf": num(dist.ppf(q))})
    d["exponential"] = ex
    dump("distributions.json", d)


# ─── descriptive ────────────────────────────────────────────────────────────────────────────────
DATASETS = {
    "fixErrors": [12.4, 9.8, 15.1, 11.0, 13.7, 8.9, 14.2],
    "burn": [3.1, 3.4, 2.9, 4.8, 3.3, 3.0, 3.6, 3.2, 3.5, 2.8, 3.9, 3.3],
    "even": [4, 8, 15, 16, 23, 42],
    "ties": [2, 2, 3, 3, 3, 5, 7, 7, 7, 9],
    "skewed": [1, 1, 2, 2, 2, 3, 3, 4, 5, 7, 9, 14, 22],
    "two": [5, 9],
    "three": [1, 2, 100],
    "negatives": [-4.5, -1.25, 0, 0.75, 2.5, 3.125, -0.5, 1.5],
}


def ti84_quartiles(xs):
    s = sorted(xs)
    n = len(s)
    mid = n // 2
    lower = s[:mid]
    upper = s[mid + 1:] if n % 2 == 1 else s[mid:]
    return float(np.median(lower)), float(np.median(s)), float(np.median(upper))


def gen_descriptive():
    out = []
    for name, xs in DATASETS.items():
        a = np.array(xs, dtype=float)
        q1, q2, q3 = ti84_quartiles(xs)
        item = {
            "name": name, "data": xs,
            "mean": num(a.mean()), "median": num(np.median(a)),
            "var": num(a.var(ddof=1)) if len(xs) > 1 else None, "sd": num(a.std(ddof=1)) if len(xs) > 1 else None,
            "popVar": num(a.var(ddof=0)), "popSd": num(a.std(ddof=0)),
            "min": num(a.min()), "max": num(a.max()),
            "q1": q1, "q3": q3, "iqr": q3 - q1,
            "skew": num(stats.skew(a, bias=False)) if len(xs) > 2 else None,
            "percentiles": {str(p): num(np.percentile(a, p)) for p in [0, 10, 25, 33.3, 50, 75, 90, 95, 100]},
            "zscores": [num(z) for z in stats.zscore(a, ddof=1)] if len(xs) > 1 else None,
        }
        out.append(item)
    weighted = {"values": [80, 90, 70], "weights": [1, 2, 1], "mean": num(np.average([80, 90, 70], weights=[1, 2, 1]))}
    hist = []
    for name in ["burn", "skewed"]:
        a = np.array(DATASETS[name], dtype=float)
        counts, edges = np.histogram(a, bins="sturges")
        hist.append({"name": name, "method": "sturges", "counts": [int(c) for c in counts], "edges": [num(e) for e in edges]})
        counts, edges = np.histogram(a, bins=5)
        hist.append({"name": name, "method": "count5", "counts": [int(c) for c in counts], "edges": [num(e) for e in edges]})
    dump("descriptive.json", {"datasets": out, "weighted": weighted, "histograms": hist})


# ─── regression ─────────────────────────────────────────────────────────────────────────────────
REG_SETS = {
    "cargo": {
        "x": [120, 150, 180, 210, 240, 270, 300, 330, 360, 390],
        "y": [3.2, 3.9, 4.1, 5.0, 5.4, 6.3, 6.5, 7.4, 7.9, 8.2],
    },
    "transit": {
        "x": [1.5, 2.1, 2.8, 3.3, 3.9, 4.6, 5.2, 6.0, 6.8, 7.5, 8.1, 9.0],
        "y": [42.1, 39.5, 37.9, 35.2, 36.0, 31.8, 30.5, 28.9, 27.7, 24.1, 25.0, 21.3],
    },
    "influential": {
        "x": [1, 2, 3, 4, 5, 6, 7, 20],
        "y": [2.1, 3.9, 6.2, 7.8, 10.1, 12.2, 13.8, 40.5],
    },
    "tiny": {"x": [1, 2, 3], "y": [2, 4.1, 5.9]},
    "expgrowth": {"x": [1, 2, 3, 4, 5, 6, 7, 8], "y": [2.7, 3.6, 5.1, 6.9, 9.3, 12.8, 17.1, 23.5]},
    "power": {"x": [1, 2, 4, 8, 16, 32], "y": [3.1, 8.8, 25.0, 71.2, 200.5, 566.0]},
}


def reg_block(x, y):
    x = np.array(x, float)
    y = np.array(y, float)
    n = len(x)
    res = stats.linregress(x, y)
    fitted = res.intercept + res.slope * x
    resid = y - fitted
    sse = float(np.sum(resid ** 2))
    s = math.sqrt(sse / (n - 2)) if n > 2 else float("nan")
    sxx = float(np.sum((x - x.mean()) ** 2))
    lev = 1 / n + (x - x.mean()) ** 2 / sxx
    std_resid = resid / (s * np.sqrt(1 - lev)) if n > 2 else np.full(n, np.nan)
    cooks = (std_resid ** 2 / 2) * (lev / (1 - lev)) if n > 2 else np.full(n, np.nan)
    return {
        "n": n, "slope": num(res.slope), "intercept": num(res.intercept), "r": num(res.rvalue), "r2": num(res.rvalue ** 2),
        "pValue": num(res.pvalue), "seSlope": num(res.stderr), "seIntercept": num(res.intercept_stderr),
        "s": num(s), "sse": sse, "sst": float(np.sum((y - y.mean()) ** 2)),
        "xMean": num(x.mean()), "yMean": num(y.mean()), "sx": num(x.std(ddof=1)), "sy": num(y.std(ddof=1)),
        "fitted": [num(v) for v in fitted], "residuals": [num(v) for v in resid],
        "leverage": [num(v) for v in lev], "cooks": [num(v) for v in cooks], "stdResiduals": [num(v) for v in std_resid],
        "tSlope": num(res.slope / res.stderr) if n > 2 else None,
    }


def gen_regression():
    out = {}
    for name, d in REG_SETS.items():
        block = {"x": d["x"], "y": d["y"], "linear": reg_block(d["x"], d["y"])}
        x = np.array(d["x"], float)
        y = np.array(d["y"], float)
        if np.all(x > 0) and np.all(y > 0):
            block["logy"] = reg_block(x, np.log10(y))
            block["logx"] = reg_block(np.log10(x), y)
            block["loglog"] = reg_block(np.log10(x), np.log10(y))
            block["lny"] = reg_block(x, np.log(y))
        out[name] = block
    # from summary stats
    r, sx, sy, xm, ym = 0.83, 12.5, 4.2, 100, 30
    out["summary"] = {"r": r, "sx": sx, "sy": sy, "xMean": xm, "yMean": ym, "slope": r * sy / sx, "intercept": ym - r * sy / sx * xm}
    dump("regression.json", out)


# ─── inference ──────────────────────────────────────────────────────────────────────────────────
def gen_inference():
    out = {}
    # One-sample t
    one = []
    for name, xs, mu0 in [
        ("reactor", [98.2, 101.5, 99.8, 100.9, 102.3, 98.7, 100.1, 101.0, 99.4, 100.6], 100),
        ("fixErrors", DATASETS["fixErrors"], 10),
        ("transit", [44.1, 46.3, 45.2, 47.8, 43.9, 45.5, 46.9, 44.7, 45.1, 46.2, 47.0, 44.4, 45.8, 46.6, 45.0], 45),
        ("tiny", [2.1, 2.9, 3.4], 2),
    ]:
        a = np.array(xs, float)
        n = len(a)
        se = a.std(ddof=1) / math.sqrt(n)
        cases = {}
        for alt in ["two-sided", "less", "greater"]:
            r = stats.ttest_1samp(a, mu0, alternative=alt)
            cases[alt] = {"t": num(r.statistic), "p": num(r.pvalue)}
        cis = {}
        for c in [0.90, 0.95, 0.99]:
            lo, hi = stats.t.interval(c, n - 1, loc=a.mean(), scale=se)
            cis[str(c)] = [num(lo), num(hi)]
        one.append({"name": name, "data": xs, "mu0": mu0, "n": n, "mean": num(a.mean()), "sd": num(a.std(ddof=1)), "se": num(se), "df": n - 1, "tests": cases, "ci": cis})
    out["oneSampleT"] = one
    # Paired t
    paired = []
    for name, before, after in [
        ("refit", [12.1, 11.8, 13.0, 12.6, 11.9, 12.4, 13.1, 12.2, 12.8, 12.0], [11.4, 11.9, 12.2, 12.0, 11.5, 11.8, 12.6, 11.7, 12.3, 11.6]),
        ("calib", [5.0, 5.2, 4.9, 5.5, 5.1, 5.3], [5.1, 5.0, 5.0, 5.4, 5.2, 5.1]),
    ]:
        b = np.array(before, float)
        a = np.array(after, float)
        diff = a - b
        n = len(diff)
        se = diff.std(ddof=1) / math.sqrt(n)
        cases = {}
        for alt in ["two-sided", "less", "greater"]:
            r = stats.ttest_rel(a, b, alternative=alt)
            cases[alt] = {"t": num(r.statistic), "p": num(r.pvalue)}
        lo, hi = stats.t.interval(0.95, n - 1, loc=diff.mean(), scale=se)
        paired.append({"name": name, "before": before, "after": after, "n": n, "meanDiff": num(diff.mean()), "sdDiff": num(diff.std(ddof=1)), "se": num(se), "df": n - 1, "tests": cases, "ci95": [num(lo), num(hi)]})
    out["pairedT"] = paired
    # Two-sample t (Welch) + conservative df
    two = []
    for name, g1, g2 in [
        ("corridor", [31.2, 29.8, 33.5, 30.9, 32.4, 28.7, 31.8, 30.1, 32.9, 29.5, 31.0, 30.6], [27.4, 28.9, 26.5, 29.8, 27.9, 28.2, 26.1, 29.0, 27.7, 28.4]),
        ("unequal", [5.1, 4.8, 5.6, 5.3, 4.9, 5.7, 5.2], [6.9, 4.1, 7.8, 3.5, 6.2, 5.0, 8.1, 4.4, 6.6, 5.9, 7.2, 3.9]),
        ("tinyGroups", [1.0, 2.0, 3.0], [2.5, 3.5, 4.5, 5.5]),
    ]:
        a = np.array(g1, float)
        b = np.array(g2, float)
        n1, n2 = len(a), len(b)
        v1, v2 = a.var(ddof=1), b.var(ddof=1)
        se = math.sqrt(v1 / n1 + v2 / n2)
        welch_df = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1))
        cases = {}
        for alt in ["two-sided", "less", "greater"]:
            r = stats.ttest_ind(a, b, equal_var=False, alternative=alt)
            cases[alt] = {"t": num(r.statistic), "p": num(r.pvalue), "df": num(r.df)}
        cons_df = min(n1 - 1, n2 - 1)
        tstat = (a.mean() - b.mean()) / se
        lo, hi = stats.t.interval(0.95, welch_df, loc=a.mean() - b.mean(), scale=se)
        lo_c, hi_c = stats.t.interval(0.95, cons_df, loc=a.mean() - b.mean(), scale=se)
        p_cons = 2 * stats.t.sf(abs(tstat), cons_df)
        two.append({"name": name, "a": g1, "b": g2, "n1": n1, "n2": n2, "mean1": num(a.mean()), "mean2": num(b.mean()), "sd1": num(a.std(ddof=1)), "sd2": num(b.std(ddof=1)),
                    "se": num(se), "welchDf": num(welch_df), "conservativeDf": cons_df, "tests": cases, "ci95Welch": [num(lo), num(hi)], "ci95Conservative": [num(lo_c), num(hi_c)], "pTwoSidedConservative": num(p_cons)})
    out["twoSampleT"] = two
    # Proportions (manual, AP formulas)
    props = []
    for x, n, p0 in [(56, 200, 0.25), (12, 40, 0.5), (183, 250, 0.7), (9, 100, 0.05), (95, 100, 0.9)]:
        phat = x / n
        se_test = math.sqrt(p0 * (1 - p0) / n)
        se_ci = math.sqrt(phat * (1 - phat) / n)
        z = (phat - p0) / se_test
        tests = {"two-sided": 2 * stats.norm.sf(abs(z)), "less": stats.norm.cdf(z), "greater": stats.norm.sf(z)}
        cis = {}
        for c in [0.90, 0.95, 0.99]:
            zs = stats.norm.ppf((1 + c) / 2)
            cis[str(c)] = [phat - zs * se_ci, phat + zs * se_ci]
        props.append({"x": x, "n": n, "p0": p0, "phat": phat, "seTest": se_test, "seCI": se_ci, "z": z, "tests": {k: num(v) for k, v in tests.items()}, "ci": cis})
    out["oneProp"] = props
    two_props = []
    for x1, n1, x2, n2 in [(48, 160, 30, 150), (120, 400, 95, 400), (15, 60, 27, 75), (200, 250, 210, 300)]:
        p1, p2 = x1 / n1, x2 / n2
        pc = (x1 + x2) / (n1 + n2)
        se_pooled = math.sqrt(pc * (1 - pc) * (1 / n1 + 1 / n2))
        se_unpooled = math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)
        z = (p1 - p2) / se_pooled
        tests = {"two-sided": 2 * stats.norm.sf(abs(z)), "less": stats.norm.cdf(z), "greater": stats.norm.sf(z)}
        zs = stats.norm.ppf(0.975)
        two_props.append({"x1": x1, "n1": n1, "x2": x2, "n2": n2, "p1": p1, "p2": p2, "pooled": pc, "sePooled": se_pooled, "seUnpooled": se_unpooled, "z": z,
                          "tests": {k: num(v) for k, v in tests.items()}, "ci95": [p1 - p2 - zs * se_unpooled, p1 - p2 + zs * se_unpooled]})
    out["twoProp"] = two_props
    # Chi-square GOF
    gof = []
    for name, obs, probs in [
        ("cargo", [42, 55, 38, 65], [0.25, 0.25, 0.25, 0.25]),
        ("dice", [18, 22, 15, 25, 12, 28], [1 / 6] * 6),
        ("declared", [110, 60, 30], [0.6, 0.3, 0.1]),
        ("sparse", [4, 3, 13], [0.2, 0.2, 0.6]),
    ]:
        o = np.array(obs, float)
        e = o.sum() * np.array(probs)
        r = stats.chisquare(o, e)
        gof.append({"name": name, "observed": obs, "probs": probs, "expected": [num(v) for v in e], "contributions": [num(v) for v in (o - e) ** 2 / e], "statistic": num(r.statistic), "df": len(obs) - 1, "p": num(r.pvalue)})
    out["chiSquareGOF"] = gof
    ind = []
    for name, table in [
        ("ownership", [[35, 15, 10], [20, 30, 25], [12, 18, 40]]),
        ("twoByTwo", [[30, 20], [15, 35]]),
        ("sparse", [[3, 12], [8, 2], [4, 6]]),
        ("wide", [[50, 40, 30, 20, 10], [10, 20, 30, 40, 50]]),
    ]:
        t = np.array(table, float)
        r = stats.chi2_contingency(t, correction=False)
        ind.append({"name": name, "table": table, "statistic": num(r.statistic), "p": num(r.pvalue), "df": int(r.dof), "expected": [[num(v) for v in row] for row in r.expected_freq]})
    out["chiSquareIndependence"] = ind
    # Slope inference
    slope = []
    for name, d in REG_SETS.items():
        x = np.array(d["x"], float)
        y = np.array(d["y"], float)
        n = len(x)
        if n <= 2:
            continue
        res = stats.linregress(x, y)
        cis = {}
        for c in [0.90, 0.95, 0.99]:
            ts = stats.t.ppf((1 + c) / 2, n - 2)
            cis[str(c)] = [num(res.slope - ts * res.stderr), num(res.slope + ts * res.stderr)]
        tstat = res.slope / res.stderr
        slope.append({"name": name, "n": n, "b": num(res.slope), "seB": num(res.stderr), "t": num(tstat), "df": n - 2,
                      "tests": {"two-sided": num(res.pvalue), "less": num(stats.t.cdf(tstat, n - 2)), "greater": num(stats.t.sf(tstat, n - 2))}, "ci": cis})
    out["slope"] = slope
    # Power (z-test on a mean) and sample size
    power = []
    for mu0, muA, sigma, n, alpha, alt in [(100, 103, 10, 30, 0.05, "greater"), (100, 103, 10, 30, 0.05, "two-sided"), (50, 47, 8, 40, 0.01, "less"), (0, 0.5, 1, 16, 0.05, "two-sided"), (100, 100, 10, 30, 0.05, "greater")]:
        se = sigma / math.sqrt(n)
        if alt == "greater":
            crit = mu0 + stats.norm.ppf(1 - alpha) * se
            pw = stats.norm.sf((crit - muA) / se)
        elif alt == "less":
            crit = mu0 - stats.norm.ppf(1 - alpha) * se
            pw = stats.norm.cdf((crit - muA) / se)
        else:
            z = stats.norm.ppf(1 - alpha / 2)
            pw = stats.norm.sf((mu0 + z * se - muA) / se) + stats.norm.cdf((mu0 - z * se - muA) / se)
        power.append({"mu0": mu0, "muA": muA, "sigma": sigma, "n": n, "alpha": alpha, "alt": alt, "power": num(pw)})
    out["power"] = power
    ss = []
    for moe, c, pg in [(0.03, 0.95, 0.5), (0.05, 0.90, 0.3), (0.02, 0.99, 0.5)]:
        z = stats.norm.ppf((1 + c) / 2)
        ss.append({"kind": "proportion", "moe": moe, "confidence": c, "pGuess": pg, "n": int(math.ceil(pg * (1 - pg) * (z / moe) ** 2))})
    for moe, c, sigma in [(2, 0.95, 10), (0.5, 0.99, 3), (1, 0.90, 4.5)]:
        z = stats.norm.ppf((1 + c) / 2)
        ss.append({"kind": "mean", "moe": moe, "confidence": c, "sigma": sigma, "n": int(math.ceil((z * sigma / moe) ** 2))})
    out["sampleSize"] = ss
    # Critical values
    crit = {"z": {str(c): num(stats.norm.ppf((1 + c) / 2)) for c in [0.80, 0.90, 0.95, 0.98, 0.99, 0.999]},
            "t": [{"confidence": c, "df": df, "value": num(stats.t.ppf((1 + c) / 2, df))} for c in [0.90, 0.95, 0.99] for df in [1, 2, 5, 9, 14, 19, 24, 29, 49, 99, 17.3]],
            "chi2": [{"alpha": a, "df": df, "value": num(stats.chi2.isf(a, df))} for a in [0.10, 0.05, 0.01] for df in [1, 2, 3, 4, 6, 9, 12]]}
    out["critical"] = crit
    dump("inference.json", out)


if __name__ == "__main__":
    gen_special()
    gen_distributions()
    gen_descriptive()
    gen_regression()
    gen_inference()
    print("done", file=sys.stderr)
