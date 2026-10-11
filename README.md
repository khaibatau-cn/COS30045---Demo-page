# Wattwise — TV Energy Data Story

Wattwise is a three-page COS30045 website by Lam Khai. It turns a cleaned Australian television energy dataset into an interactive story about screen size, screen technology and labelled annual energy consumption.

The site uses plain HTML, one external CSS file and vanilla JavaScript. It has no framework, package installation, CDN or build step, so it is ready for GitHub Pages or the Swinburne Mercury server.

## Data Story

### Audience

The main audience is Australian households and TV shoppers who want a clearer way to compare the energy implications of television choices. The visualisation is also suitable for students and general readers learning how product characteristics relate to energy consumption.

### Audience interest

The audience is likely to care about running costs, energy use and whether a larger screen or a particular screen technology changes the comparison. They need familiar measurements, clear chart labels and enough context to avoid mistaking dataset records for sales or treating an association as proof of cause.

### Story and purpose

The story asks: **How do screen size and screen technology relate to labelled annual TV energy consumption?**

It develops in this order:

1. **What is represented?** LCD (LED) accounts for 3,819 of the 4,724 records, or 80.8%. This describes the supplied data and is not an Australian market-share estimate.
2. **What is the main relationship?** The scatter plot shows a strong upward relationship between screen size and annual energy. Larger screens generally use more energy, although individual products vary.
3. **How do technologies compare?** Median and box plots summarise annual energy within LCD, LCD (LED) and OLED. These groups contain different screen sizes, so the scatter plot and filters provide necessary context.
4. **What can the reader do?** Readers can filter by technology, brand and screen size, inspect exact values, focus the energy range without deleting outliers and download the complete cleaned CSV.

The visualisation supports informed exploration. It does not rank products, calculate a household's actual bill or claim that screen technology alone causes a difference in energy use.

## About the data

### Data source

The source was the course-supplied file `tv_2026_02_15.csv`, containing 4,724 television records and 32 original columns. It concerns televisions available in the Australian market and includes product identifiers, brand, screen measurements, technology, power, energy star rating and labelled annual energy consumption.

The original publisher and collection method were not provided with the local file and have not been independently verified. The website therefore describes it as the **project-supplied dataset** rather than claiming a specific publisher or collection date.

### Data processing

The data was prepared in KNIME:

1. Eight relevant source columns were selected: brand, model, screen size, screen area, screen technology, average power, star rating and labelled annual energy.
2. Brand labels were trimmed and converted to uppercase with `upperCase(strip($Brand_Reg$))`. This reduced 96 raw labels to 81 normalised labels without guessing whether differently worded brands were the same organisation.
3. `ScreenSizeInches` was calculated as screen size in centimetres divided by 2.54. The original centimetre value was retained.
4. Web-facing columns were renamed clearly and all 4,724 rows were retained.
5. The cleaned file was exported as `assets/data/tv_energy_cleaned.csv`. Profiling nodes remain on side branches in the KNIME workflow.

### Privacy

The dataset contains product information rather than names, contact details, addresses or other personal information. The website does not collect, transmit or store visitor information. Filters and the calculator run locally in the browser.

### Accuracy and limitations

- The website calculations and chart totals were checked against all 4,724 cleaned rows.
- Record counts are not sales figures and are not guaranteed to represent unique TV models.
- Repeated model entries remain in the data.
- Three source model values contain the literal placeholder `NA`; they are retained.
- Brand cleaning fixes capitalisation and outer whitespace. Names such as `SAMSUNG` and `SAMSUNG ELECTRONICS` remain separate because equivalence was not assumed.
- Technology groups contain different mixes of screen sizes and models. Their medians describe the groups but do not isolate the effect of technology.
- Labelled annual energy is a dataset value and may differ from a household's actual use.
- The calculator uses constant power and excludes standby use, supply charges and changing tariffs.
- The original publisher, sampling method and update process are not independently verified.

### Ethics

The visualisation keeps all records and makes its transformations visible. It distinguishes record frequency from sales, labels chart units, retains outliers and warns readers against causal claims. Filters change the displayed comparison but do not silently alter the downloaded dataset. The site avoids presenting descriptive results as product recommendations and acknowledges uncertainty about the source and repeated records.

## Website structure

```text
index.html                            Home page, FAQ and energy calculator
televisions.html                      Data story, five charts and filters
about.html                            Purpose, method, limitations and AI use
assets/
  css/styles.css                      Shared external styling
  data/tv_energy_cleaned.csv          Cleaned KNIME export (4,724 rows)
  img/PowerIcon.png                   Supplied website logo
  js/main.js                          Footer, FAQ and calculator behaviour
  js/charts.js                        CSV parsing, filters and SVG charts
docs/
  Televisions_Page_Chart_Correction_Report.docx
  CHART_CORRECTION_CHANGELOG.md
GENAI_DECLARATION.md
DEMONSTRATION_GUIDE.md
README.md
START_LOCAL.cmd
```

## Visualisations

The Televisions page includes:

1. TV record count by screen technology
2. TV record count by star rating
3. Median labelled annual energy by technology
4. Annual energy distribution by technology (box plot)
5. Screen size versus labelled annual energy (scatter plot)

Each chart names its unit. Exact-value tables accompany the charts. The scatter and box plots offer **Full range** and **Focus on typical values** views; focusing changes only the visible scale and reports how many records lie above it. No data is deleted.

## Run locally

Double-click `START_LOCAL.cmd`, then open the address shown in the terminal. Alternatively, run a local static server in this directory:

```powershell
py -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/index.html`. A local server is required because the charts load the CSV with `fetch`.

## Publish with GitHub Pages

1. Create a GitHub repository.
2. Upload the contents of this folder so `index.html` is at the repository root.
3. Commit the files.
4. Open the repository's **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**, select the `main` branch and `/ (root)`, then save.
6. Open the GitHub Pages URL after deployment and test Home, Televisions, About Us, the FAQ, calculator, filters and CSV download.

All asset paths are relative and work on GitHub Pages project sites.

## Verification

The final files were checked for required pages and assets, local links, external styling, shared navigation, active-page states, the supplied logo, FAQ controls, calculator inputs, current-year footer, CSV availability and JavaScript syntax. The chart data contains 4,724 rows and the technology counts total 4,724.

## Chart correction change log

Lecturer feedback identified that the first charts could appear inconsistent or misleading. The data values were correct, but the presentation did not make different measures and scales clear enough.

- Chart titles now name the chart type and measure.
- Every bar chart has visible X-axis and Y-axis labels.
- Star ratings use consistent half-star positions from 1 to 8, including zero-count 6.5 and 7.5 positions.
- Count labels and exact-value tables make bar values checkable.
- All screen-technology categories remain visible after filtering, including zero-count categories.
- A reading note explains that the first charts count records while later charts measure kWh/year.
- Technology colours are consistent across bar, box and scatter charts.
- The corrected charts were rechecked against all 4,724 CSV rows and the KNIME summaries.

The full report is in [`docs/Televisions_Page_Chart_Correction_Report.docx`](docs/Televisions_Page_Chart_Correction_Report.docx), with a readable repository version in [`docs/CHART_CORRECTION_CHANGELOG.md`](docs/CHART_CORRECTION_CHANGELOG.md).

## AI Declaration

I used OpenAI ChatGPT and Codex as support tools during this project. I used Generative AI to help plan the KNIME workflow, identify inconsistent brand names that required standardisation, suggest suitable KNIME nodes and chart structures, troubleshoot workflow configuration, improve explanations, generate website HTML/CSS/JavaScript and check the resulting charts and interactions.

I reviewed the generated suggestions, checked transformations and chart choices against the supplied dataset and assignment requirements, and adapted the workflow and website to match the project focus. I remain responsible for the final workflow design, analysis, explanations and submitted files.

### Generative AI Reflection

**Tools used:** ChatGPT and Codex.

**What I used GenAI for:** Structure, KNIME workflow support, brand-cleaning rules, chart design, website code, debugging, validation and documentation.

**What I changed or adapted:** I limited automatic brand cleaning to uppercase and whitespace changes, kept uncertain brand names separate, selected the final columns and charts, kept profiling nodes on side branches, revised misleading chart presentation after lecturer feedback and added context so readers can interpret different chart measures correctly.

**What I learned:** I learned the difference between formatting cleanup and changing data meaning, how screen size can be converted from centimetres to inches, why charts need units and context, how profiling branches protect the main dataset and how HTML, CSS and JavaScript separate website structure, presentation and behaviour.

**Limitations or issues:** AI suggestions still required checking against real column names, data values, KNIME node behaviour and assignment requirements. AI could not prove that differently worded brands represented the same company or verify the dataset's original publisher. The visualisations show associations rather than causes.

A standalone copy is provided in [`GENAI_DECLARATION.md`](GENAI_DECLARATION.md).
