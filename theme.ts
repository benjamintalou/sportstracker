import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Brand orange: energetic, readable on both light and dark surfaces.
const ember: MantineColorsTuple = [
  "#fff4ec",
  "#ffe6d5",
  "#fdcaa8",
  "#fbab76",
  "#f9914c",
  "#f88031",
  "#f77722",
  "#dc6516",
  "#c4590f",
  "#ab4b05",
];

export const theme = createTheme({
  primaryColor: "ember",
  primaryShade: { light: 7, dark: 5 },
  colors: { ember },
  fontFamily: "var(--font-body), system-ui, sans-serif",
  fontFamilyMonospace: "ui-monospace, SFMono-Regular, Menlo, monospace",
  headings: {
    fontFamily: "var(--font-display), var(--font-body), sans-serif",
    fontWeight: "700",
  },
  defaultRadius: "md",
  cursorType: "pointer",
  autoContrast: true,
  components: {
    Card: { defaultProps: { withBorder: true, radius: "lg", padding: "lg" } },
    Paper: { defaultProps: { radius: "lg" } },
  },
});
