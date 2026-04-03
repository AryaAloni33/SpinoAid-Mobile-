/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: "hsl(168, 76%, 32%)",
                    foreground: "hsl(0, 0%, 100%)",
                },
                background: "hsl(210, 20%, 98%)",
                foreground: "hsl(210, 40%, 11%)",
                card: {
                    DEFAULT: "hsl(0, 0%, 100%)",
                    foreground: "hsl(210, 40%, 11%)",
                },
                muted: {
                    DEFAULT: "hsl(210, 15%, 95%)",
                    foreground: "hsl(210, 15%, 45%)",
                },
                border: "hsl(210, 20%, 90%)",
            },
            borderRadius: {
                lg: "0.625rem",
            }
        },
    },
    plugins: [],
}
