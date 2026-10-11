# Televisions Page Chart Correction

## The problem

Lecturer feedback identified that the charts at the top of the Televisions page looked inconsistent and could contradict one another. The underlying values were correct, but the presentation mixed two different measures: the first charts counted dataset records, while later charts showed annual energy in kWh/year. The star-rating chart also skipped rating positions that had zero records, making the spacing appear inconsistent.

## How the problem was identified

The website charts were checked against all 4,724 rows in `assets/data/tv_energy_cleaned.csv` and compared with the KNIME summaries. The review confirmed that:

- LCD (LED), LCD and OLED record counts total 4,724.
- Star-rating categories are measured in half-star steps from 1 to 8, but 6.5 and 7.5 have zero records.
- Count charts and energy charts use different units and scales, so their bar heights cannot be compared directly.
- The box plot and scatter plot include high-energy outliers that compress the typical values when the full range is displayed.

The issue was therefore chart communication rather than incorrect source data.

## The fix

- Renamed chart sections so every title states the chart type and measure.
- Added visible X-axis and Y-axis labels to all bar charts.
- Added zero-count 6.5-star and 7.5-star positions to preserve consistent half-star spacing.
- Added direct values and exact-value tables so chart values can be checked.
- Kept all three technology categories visible after filtering, even when a category count is zero.
- Added a note explaining that the first charts count records and the later charts measure annual energy.
- Applied consistent technology colours across the bar charts, box plot and scatter plot.
- Added independent Full range and Focus on typical values controls to the box and scatter plots. The focused view changes only the visible scale, states how many records sit above it and keeps all records in the statistics and CSV.
- Added an explanation of the box, median, whiskers and outliers.

## Validation after correction

The revised charts were rechecked against the cleaned CSV and KNIME summaries. All 4,724 records remain in the dataset, filters recalculate the charts correctly, exact-value tables match the chart summaries and focused views do not delete or change records.

## Result

The charts now tell one consistent story: the first panels explain what the dataset contains, and the later panels explain how labelled annual energy varies by technology and screen size. The page also warns the reader that record counts are not sales and that technology comparisons must be interpreted alongside screen size.
