/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			colors: {
				"pi-green": "#2d9f48",
				"pi-red": "#c51a4a",
				"pi-dark": "#0d1117",
				"pi-darker": "#010409",
				"pi-surface": "#161b22",
				"pi-border": "#30363d",
				"pi-text": "#e6edf3",
				"pi-muted": "#8b949e",
			},
			fontFamily: {
				mono: ["JetBrains Mono", "Fira Code", "monospace"],
			},
		},
	},
	plugins: [],
};
