import { client } from "@/api/client"
import type { LoginRequest, LoginResponse, RegisterRequest } from "@/api/types"

export async function loginUser(payload: LoginRequest): Promise<LoginResponse> {
  const res = await client.post<LoginResponse>("/auth/login", payload)
  return res.data
}

export async function registerUser(payload: RegisterRequest): Promise<LoginResponse> {
  const res = await client.post<LoginResponse>("/auth/register", payload)
  return res.data
}

export async function logoutUser(): Promise<void> {
  await client.post("/auth/logout")
}

export async function fetchCurrentUser(): Promise<LoginResponse["user"]> {
  const res = await client.get<LoginResponse["user"]>("/auth/me")
  return res.data
}
