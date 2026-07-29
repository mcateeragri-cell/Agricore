const themeScript = `
(function () {
  try {
    var storageKey = "agricore-theme";
    var savedTheme = localStorage.getItem(storageKey);
    var theme =
      savedTheme === "light" ||
      savedTheme === "dark" ||
      savedTheme === "system"
        ? savedTheme
        : "system";

    var isDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches);

    var root = document.documentElement;

    root.classList.toggle("dark", isDark);
    root.dataset.theme = isDark ? "dark" : "light";
    root.style.colorScheme = isDark ? "dark" : "light";
  } catch (error) {
    console.error(
      "Unable to initialise the AgriCore theme.",
      error
    );
  }
})();
`;

export default function ThemeInitialiser() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: themeScript,
      }}
    />
  );
}