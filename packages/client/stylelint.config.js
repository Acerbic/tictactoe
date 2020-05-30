// for vscode + tailwind
// @see https://www.meidev.co/blog/visual-studio-code-css-linting-with-tailwind/
module.exports = {
    rules: {
        "at-rule-no-unknown": [
            true,
            {
                ignoreAtRules: [
                    "tailwind",
                    "apply",
                    "variants",
                    "responsive",
                    "screen"
                ]
            }
        ],
        "declaration-block-trailing-semicolon": null,
        "no-descending-specificity": null
    }
};
