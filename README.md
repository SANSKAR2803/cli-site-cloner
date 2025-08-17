## Site Cloner CLI



🚀 Site Cloner CLI is a command-line tool that lets you clone any website locally (HTML, CSS, JS, assets) and make it functional offline.Great for learning, backups, or experimenting with website structures.

✨ Features

🔗 Clone any given website locally

📂 Saves HTML, CSS, JS, images, fonts

🔄 Rewrites internal links → so cloned pages work offline

⚡ Concurrency & depth control (faster cloning)

🖥️ CLI-based → no extra UI, just commands

🔍 Optional preview with a lightweight dev server

📦 Installation

## Clone the repo:
git clone https://github.com/yourusername/site-cloner-cli.git
cd site-cloner-cli
npm install
🚀 Usage

## Clone a website into a folder:
node index.js <website-url> --out <output-directory>
This will:

Fetch all pages (up to depth 2, configurable)

Save them to dist/

Rewrite relative links so you can open them offline
## 🔍 Preview cloned site
npm run preview 
This starts a local server at:👉 http://localhost:5050
## Configuration

Inside index.js you can tweak:
const config = {
  maxDepth: 2,            // how many levels deep to crawl
  maxPages: 50,           // max pages to clone
  concurrency: 8,         // parallel requests
  includeSubdomains: false,
  fetchExternalAssets: true
}
🗂️ Project Structure
site-cloner-cli/
│── index.js           # Main CLI tool logic
│── package.json       # NPM config + scripts
│── scripts/
│    └── preview.js    # Local preview server
│── dist/              # Output folder (after cloning)
└── README.md          # Project docs
Scripts
npm run clone     # Run site cloner manually
npm run preview   # Start local preview server
npm run clean     # Remove dist folder
📸 Example
node index.js https://piyushgarg.dev --out dist
👉 Opens a fully functional offline clone in dist/.
🤝 Contributing
Contributions are welcome! 🎉

Fork this repo

Create a feature branch (git checkout -b feature-xyz)

Commit changes (git commit -m "Added xyz feature")

Push & open a Pull Request 🚀
📜 License

This project is licensed under the MIT License – free to use, modify, and share
⭐ Support

If you find this project useful, don’t forget to star ⭐ the repo on GitHub!

