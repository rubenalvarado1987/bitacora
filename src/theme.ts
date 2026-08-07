// Tokens de marca de Bitácora — mismos valores usados en el mockup HTML de referencia.
export const colors = {
  ink: "#1B2430",
  paper: "transparent", // el fondo real lo aporta el degradado global (GradientBackground)
  card: "#FFFFFF",
  teal: "#1F6F6B",
  tealDark: "#164F4C",
  tealTint: "#E4F0EE",
  amber: "#B9791F",
  amberTint: "#F7EBD8",
  slate: "#5B6472",
  line: "#E4DFD5",
  green: "#2F7D5E",
  greenTint: "#E4F1EA",
  danger: "#B0362C",
  dangerTint: "#F8E7E5",
};

export const rubroColor: Record<string, string> = {
  colegio: colors.teal,
  hogar: colors.amber,
  gimnasio: colors.green,
  psicologia: colors.slate,
};

// Degradado suave menta → durazno usado como fondo global de toda la app.
export const gradient = {
  background: ["#DCEEE8", "#EFEDE1", "#FBE3DA"] as const,
};

export const shadow = {
  soft: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 };

export const font = {
  title: { fontSize: 22, fontWeight: "600" as const, color: colors.ink },
  subtitle: { fontSize: 15, fontWeight: "500" as const, color: colors.ink },
  body: { fontSize: 14, color: colors.ink },
  muted: { fontSize: 12, color: colors.slate },
  label: { fontSize: 11, color: colors.slate, letterSpacing: 0.4 },
};
