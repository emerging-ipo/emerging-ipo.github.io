# Emerging Stock Radar

GitHub Pages edition of the Taiwan emerging-stock market dashboard.

## Publishing

The repository must be named `esrstk.github.io` under the `esrstk` GitHub user or organization. GitHub Actions builds the static site and publishes the `out` directory to GitHub Pages.

The public frontend reads live market and IPO data from the existing public data service. A market and tracker snapshot is bundled into every build so the site can still show the most recently generated data when a live request is temporarily unavailable.
