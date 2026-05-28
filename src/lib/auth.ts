let _accessToken: string | null = null

export const auth = {
  setToken: (token: string) => { _accessToken = token },
  getToken: () => _accessToken,
  clear: () => { _accessToken = null },
  isAuthenticated: () => _accessToken !== null,
}
