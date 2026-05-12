"use client"

import Link from "next/link"
import { useState } from "react"
import { API_BASE_URL } from "@/lib/api"

const API = API_BASE_URL

const parseJsonSafe = async (res: Response) => {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export default function CustomerRegisterPage() {
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ kind: "success" | "error"; message: string } | null>(null)

  const submit = async () => {
    if (password !== confirmPassword) {
      setResult({ kind: "error", message: "Passwords do not match" })
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const body = { fullName, phone, email, password }
      const res = await fetch(`${API}/api/customers/self-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await parseJsonSafe(res)
      if (res.ok) {
        setResult({ kind: "success", message: "Registered successfully" })
      } else {
        const message =
          data?.detail ??
          data?.Detail ??
          data?.message ??
          data?.Message ??
          data?.title ??
          data?.Title ??
          res.statusText
        setResult({ kind: "error", message })
      }
    } catch (err) {
      setResult({ kind: "error", message: err instanceof Error ? err.message : "Network error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-register">
      <div className="auth-register-card">
        <div className="auth-register-illustration">
          <img src="/assets/parts.png" alt="Vehicle parts" />
        </div>

        <form
          className="auth-register-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!loading && agree) submit()
          }}
        >
          <header className="auth-register-form-head">
            <h2>Customer Information</h2>
          </header>

          <div className="auth-register-field">
            <label htmlFor="reg-fullName">Full Name</label>
            <input
              id="reg-fullName"
              className="auth-register-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="auth-register-row">
            <div className="auth-register-field">
              <label htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                className="auth-register-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="auth-register-field">
              <label htmlFor="reg-phone">Phone</label>
              <input
                id="reg-phone"
                className="auth-register-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="auth-register-field">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              className="auth-register-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="auth-register-field">
            <label htmlFor="reg-confirm">Confirm Password</label>
            <input
              id="reg-confirm"
              className="auth-register-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <label className="auth-register-terms">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I agree to terms</span>
          </label>

          <div className="auth-register-actions">
            <Link href="/auth/login" className="auth-register-link">
              Already have an account? <strong>Sign in</strong>
            </Link>
            <button type="submit" className="auth-register-primary" disabled={loading || !agree}>
              {loading ? "Registering…" : "Register"}
            </button>
          </div>

          {result && (
            <div className={`auth-register-alert auth-register-alert-${result.kind}`} role="status">
              {result.message}
            </div>
          )}

          <p className="auth-register-foot">
            Need a staff account?{" "}
            <Link href="/staff/register" className="auth-register-foot-link">
              Register as staff
            </Link>
          </p>
        </form>
      </div>
    </section>
  )
}
