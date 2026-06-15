# Gated Ranker Validation

## Setup
| Field | Value |
| --- | --- |
| Generated | 2026-06-14T09:17:13.894Z |
| Splits | xarray (18 instances), sklearn (31 instances) |
| Budgets | 400, 1200 |
| Candidate rankers | lexical, structural, structural-neighbor, dependency-neighbor |
| Policies | budget-rank-frontier |
| Label rule | structural wins ties within epsilon=0.005 |
| Gate | one-stump threshold over observable packet/ranker-disagreement features |
| Scoring | SWE-Explore official-style F1 |

## Aggregate Results
| Metric | Value |
| --- | --- |
| Best fixed mean F1 | 0.217 |
| Robust fixed mean F1 | 0.217 |
| Held-out gate rows | 12 |
| Mean held-out routed delta vs structural | -0.002 |
| Mean held-out routed delta vs best fixed | -0.003 |
| Mean held-out regret vs oracle | 0.007 |
| Stable gates under epsilon | 8 |
| Stable non-abstaining gates under epsilon | 1 |

## Per-Budget Results
| Budget | Best fixed | Best F1 | Robust fixed | Robust F1 | Gate held-out delta vs best | Gate regret |
| --- | --- | --- | --- | --- | --- | --- |
| 400 | structural/budget-rank-frontier | 0.170 | structural/budget-rank-frontier | 0.170 | -0.002 | 0.005 |
| 1200 | structural-neighbor/budget-rank-frontier | 0.265 | structural-neighbor/budget-rank-frontier | 0.265 | -0.003 | 0.008 |

## Split Results
| Split | Instances | Rankers | Budgets |
| --- | --- | --- | --- |
| xarray | 18 | lexical, structural, structural-neighbor, dependency-neighbor | 400, 1200 |
| sklearn | 31 | lexical, structural, structural-neighbor, dependency-neighbor | 400, 1200 |

## Oracle Headroom
| Budget | Mean oracle gain vs structural | Mean routed regret | Rows |
| --- | --- | --- | --- |
| 400 | 0.003 | 0.005 | 6 |
| 1200 | 0.006 | 0.008 | 6 |

## Gate Rules
| Train split | Budget | Candidate | Policy | Rule | Held-out delta vs best | Held-out regret |
| --- | --- | --- | --- | --- | --- | --- |
| sklearn | 400 | dependency-neighbor | budget-rank-frontier | always structural | 0.000 | 0.000 |
| xarray | 400 | dependency-neighbor | budget-rank-frontier | always structural | -0.000 | 0.004 |
| sklearn | 400 | lexical | budget-rank-frontier | if candidate:maxFileClusterShare > 0.101 then lexical else structural | -0.011 | 0.017 |
| xarray | 400 | lexical | budget-rank-frontier | always structural | 0.000 | 0.007 |
| sklearn | 400 | structural-neighbor | budget-rank-frontier | always structural | 0.000 | 0.000 |
| xarray | 400 | structural-neighbor | budget-rank-frontier | always structural | -0.001 | 0.002 |
| sklearn | 1200 | dependency-neighbor | budget-rank-frontier | always structural | -0.002 | 0.007 |
| xarray | 1200 | dependency-neighbor | budget-rank-frontier | if baseline:queryCandidateTermOverlap > 0.884 then dependency-neighbor else structural | -0.006 | 0.006 |
| sklearn | 1200 | lexical | budget-rank-frontier | if baseline:averageEventsPerFile > 4.938 then lexical else structural | -0.010 | 0.018 |
| xarray | 1200 | lexical | budget-rank-frontier | if delta:implementationPathShare > 0.054 then lexical else structural | 0.002 | 0.011 |
| sklearn | 1200 | structural-neighbor | budget-rank-frontier | always structural | -0.005 | 0.006 |
| xarray | 1200 | structural-neighbor | budget-rank-frontier | if baseline:implementationPathShare > 0.757 then structural-neighbor else structural | -0.000 | 0.001 |

## Case Comparisons
### Biggest Candidate Wins
| Split | Budget | Candidate | Instance | Delta | Top feature delta |
| --- | --- | --- | --- | --- | --- |
| xarray | 1200 | lexical | pydata__xarray-6461 | 0.079 | totalLineCost=-136.000 |
| sklearn | 400 | lexical | scikit-learn__scikit-learn-26194 | 0.068 | totalLineCost=-1262.000 |
| xarray | 1200 | dependency-neighbor | pydata__xarray-3677 | 0.065 | totalLineCost=-320.000 |
| xarray | 1200 | structural-neighbor | pydata__xarray-3677 | 0.065 | totalLineCost=-40.000 |
| sklearn | 1200 | lexical | scikit-learn__scikit-learn-10908 | 0.063 | totalLineCost=-964.000 |
| sklearn | 1200 | lexical | scikit-learn__scikit-learn-14710 | 0.062 | totalLineCost=-1103.000 |
| sklearn | 1200 | lexical | scikit-learn__scikit-learn-13779 | 0.061 | totalLineCost=359.000 |
| xarray | 1200 | lexical | pydata__xarray-3993 | 0.061 | totalLineCost=-1993.000 |
| sklearn | 1200 | lexical | scikit-learn__scikit-learn-12585 | 0.060 | totalLineCost=256.000 |
| sklearn | 400 | lexical | scikit-learn__scikit-learn-13779 | 0.059 | totalLineCost=359.000 |

### Biggest Candidate Losses
| Split | Budget | Candidate | Instance | Delta | Top feature delta |
| --- | --- | --- | --- | --- | --- |
| sklearn | 1200 | lexical | scikit-learn__scikit-learn-14983 | -0.173 | totalLineCost=720.000 |
| sklearn | 400 | lexical | scikit-learn__scikit-learn-14141 | -0.148 | totalLineCost=-429.000 |
| sklearn | 400 | lexical | scikit-learn__scikit-learn-12585 | -0.145 | totalLineCost=256.000 |
| sklearn | 1200 | dependency-neighbor | scikit-learn__scikit-learn-14983 | -0.145 | totalLineCost=-1400.000 |
| sklearn | 1200 | lexical | scikit-learn__scikit-learn-13124 | -0.131 | totalLineCost=-911.000 |
| xarray | 400 | lexical | pydata__xarray-4075 | -0.123 | totalLineCost=-1240.000 |
| xarray | 1200 | lexical | pydata__xarray-3677 | -0.106 | totalLineCost=-645.000 |
| xarray | 400 | lexical | pydata__xarray-3677 | -0.098 | totalLineCost=-645.000 |
| sklearn | 400 | lexical | scikit-learn__scikit-learn-10908 | -0.086 | totalLineCost=-964.000 |
| xarray | 1200 | lexical | pydata__xarray-3305 | -0.069 | totalLineCost=-1136.000 |

## Decision
Benchmark-only non-abstaining gates passed the epsilon screen: xarray/lexical@1200. Treat abstaining rules as evidence for keeping the structural baseline, and keep runtime default conservative until a sealed held-out report confirms transfer.
