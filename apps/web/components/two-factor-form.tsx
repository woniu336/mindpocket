"use client"

import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { twoFactor } from "@/lib/auth-client"
import { isPendingTwoFactorStateError } from "@/lib/auth-flow"
import { useT } from "@/lib/i18n"

type Mode = "totp" | "backup"

interface TwoFactorFormProps {
  nextPath: string
  onBackToLogin: () => void
}

export function TwoFactorForm({ nextPath, onBackToLogin }: TwoFactorFormProps) {
  const t = useT()
  const [mode, setMode] = useState<Mode>("totp")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  const switchMode = (next: Mode) => {
    setMode(next)
    setCode("")
  }

  const returnToCredentials = () => {
    setMode("totp")
    setCode("")
    onBackToLogin()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result =
      mode === "totp"
        ? await twoFactor.verifyTotp({ code })
        : await twoFactor.verifyBackupCode({ code })

    setLoading(false)

    if (result.error) {
      if (isPendingTwoFactorStateError(result.error.message)) {
        // The pending 2FA cookie is gone, so the user must restart sign-in.
        toast.error(t.twoFactor.stateExpired)
        returnToCredentials()
        return
      }

      toast.error(mode === "totp" ? t.twoFactor.verifyFailed : t.twoFactor.backupCodeFailed)
      setCode("")
      return
    }

    toast.success(t.auth.loginSuccess)
    window.location.href = nextPath
  }

  const isTotp = mode === "totp"
  const isSubmittable = isTotp ? code.length === 6 : code.length === 11

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-bold text-2xl">{t.twoFactor.loginTitle}</h1>
          <p className="text-balance text-muted-foreground text-sm">
            {isTotp ? t.twoFactor.loginDesc : t.twoFactor.useBackupCode}
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="auth-code">
            {isTotp ? t.twoFactor.enterCode : t.twoFactor.backupCodes}
          </FieldLabel>
          {isTotp ? (
            <Input
              autoComplete="one-time-code"
              autoFocus
              disabled={loading}
              id="auth-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder={t.twoFactor.codePlaceholder}
              value={code}
            />
          ) : (
            <Input
              autoFocus
              disabled={loading}
              id="auth-code"
              maxLength={11}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t.twoFactor.backupCodePlaceholder}
              value={code}
            />
          )}
        </Field>

        <Field>
          <Button className="w-full" disabled={loading || !isSubmittable} type="submit">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.twoFactor.verify}
          </Button>
        </Field>

        <div className="flex flex-col items-center gap-1.5 text-center">
          {isTotp ? (
            <button
              className="text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground"
              onClick={() => switchMode("backup")}
              type="button"
            >
              {t.twoFactor.cantUseAuthenticator}
            </button>
          ) : (
            <button
              className="text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground"
              onClick={() => switchMode("totp")}
              type="button"
            >
              {t.twoFactor.backToTotp}
            </button>
          )}
          <button
            className="text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground"
            onClick={returnToCredentials}
            type="button"
          >
            {t.twoFactor.backToLogin}
          </button>
        </div>
      </FieldGroup>
    </form>
  )
}
