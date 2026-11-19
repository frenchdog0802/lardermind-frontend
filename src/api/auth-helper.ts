type JwtPayload = any;

export const authHelper = {
  isAuthenticated: (): JwtPayload | false => {
    if (typeof window === "undefined") return false;
    const jwtStr = localStorage.getItem("jwt");
    return jwtStr ? JSON.parse(jwtStr) : false;
  },

  getJWT: (): string | null => {
    if (typeof window === "undefined") return null;
    const jwtStr = localStorage.getItem("jwt");
    return jwtStr ? JSON.parse(jwtStr) : null;
  },

  authenticate: (jwt: unknown) => {
    if (typeof window !== "undefined") localStorage.setItem("jwt", JSON.stringify(jwt));
  },

  clearJWT: () => {
    if (typeof window !== "undefined") localStorage.removeItem("jwt");
  },
};
