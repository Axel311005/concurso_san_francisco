"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  addJudge,
  addTeam,
  createSession,
  importQuestionsFromFile,
  importQuestionsFromRepo,
} from "@/lib/actions/admin";
import { MAX_TEAM_MEMBERS } from "@/lib/validators/session";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FieldHint,
  Input,
  Label,
  SectionTitle,
  Select,
} from "@/components/ui/input";

type SessionRow = {
  id: string;
  code: string;
  teams: { id: string; nombre: string }[];
  judges: { id: string; label: string }[];
};

export function AdminPanel({
  sessions,
  questionCount,
  baseUrl,
}: {
  sessions: SessionRow[];
  questionCount: number;
  baseUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [selectedCode, setSelectedCode] = useState("");
  const [qrPreview, setQrPreview] = useState<{
    label: string;
    url: string;
    dataUrl: string;
  } | null>(null);
  const [teamMemberNames, setTeamMemberNames] = useState<string[]>([""]);
  const [pendingAction, setPendingAction] = useState<
    "team" | "judge" | "session" | "import" | null
  >(null);
  const [teamBtnSuccess, setTeamBtnSuccess] = useState(false);
  const [judgeBtnSuccess, setJudgeBtnSuccess] = useState(false);
  const [newTeamHighlight, setNewTeamHighlight] = useState<string | null>(null);
  const [newJudgeHighlight, setNewJudgeHighlight] = useState<string | null>(null);

  useEffect(() => {
    if (sessions.length === 0) return;
    const exists = sessions.some((s) => s.code === selectedCode);
    if (!selectedCode || !exists) {
      setSelectedCode(sessions[0].code);
    }
  }, [sessions, selectedCode]);

  const selected = sessions.find((s) => s.code === selectedCode);

  async function handleImportRepo() {
    startTransition(async () => {
      setPendingAction("import");
      const r = await importQuestionsFromRepo();
      setPendingAction(null);
      setMessage(
        r.ok
          ? `Importadas ${r.data.imported} preguntas`
          : r.error,
      );
      if (r.ok) router.refresh();
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    startTransition(async () => {
      setPendingAction("import");
      const r = await importQuestionsFromFile(text);
      setPendingAction(null);
      setMessage(
        r.ok
          ? `Importadas ${r.data.imported} preguntas`
          : r.error,
      );
      if (r.ok) router.refresh();
    });
  }

  async function handleCreateSession(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get("code") ?? "");
    startTransition(async () => {
      setPendingAction("session");
      const r = await createSession(code);
      setPendingAction(null);
      setMessage(r.ok ? `Sesión ${r.data.code} creada` : r.error);
      if (r.ok) {
        setSelectedCode(r.data.code);
        router.refresh();
      }
    });
  }

  async function handleAddTeam(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const fd = new FormData(e.currentTarget);
    const miembros = teamMemberNames.map((n) => n.trim()).filter(Boolean);
    if (miembros.length === 0) {
      setMessage("Añade al menos un integrante");
      return;
    }
    startTransition(async () => {
      setPendingAction("team");
      setTeamBtnSuccess(false);
      const nombre = String(fd.get("nombre") ?? "");
      const r = await addTeam(selected.id, {
        nombre,
        miembros,
        ordenTurno: selected.teams.length,
      });
      setPendingAction(null);
      setMessage(r.ok ? "Equipo añadido" : r.error);
      if (r.ok) {
        setTeamMemberNames([""]);
        setNewTeamHighlight(nombre);
        setTeamBtnSuccess(true);
        window.setTimeout(() => setTeamBtnSuccess(false), 1200);
        window.setTimeout(() => setNewTeamHighlight(null), 2000);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    });
  }

  async function handleAddJudge(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      setPendingAction("judge");
      setJudgeBtnSuccess(false);
      const label = String(fd.get("label") ?? "");
      const r = await addJudge(selected.id, {
        label,
        pin: String(fd.get("pin") ?? ""),
      });
      setPendingAction(null);
      setMessage(r.ok ? "Jurado añadido" : r.error);
      if (r.ok) {
        setNewJudgeHighlight(label);
        setJudgeBtnSuccess(true);
        window.setTimeout(() => setJudgeBtnSuccess(false), 1200);
        window.setTimeout(() => setNewJudgeHighlight(null), 2000);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    });
  }

  async function showQr(label: string, url: string) {
    const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2 });
    setQrPreview({ label, url, dataUrl });
  }

  function LinkRow({
    label,
    href,
    onQr,
  }: {
    label: string;
    href: string;
    onQr: () => void;
  }) {
    return (
      <li
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm"
      >
        <span className="min-w-0 flex-1 font-medium text-foreground">{label}</span>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            size="sm"
            variant="soft"
            className="min-w-[5.5rem]"
            onClick={onQr}
          >
            Ver QR
          </Button>
          <ButtonLink
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
          >
            Abrir
          </ButtonLink>
        </div>
      </li>
    );
  }

  const messageVariant =
    /error|ocupada|inválid|incorrecto/i.test(message)
      ? "error"
      : /añadid|creada|importadas/i.test(message)
        ? "success"
        : "default";

  const links = selected
    ? {
        moderator: `${baseUrl}/session/${selected.code}/moderator`,
        display: `${baseUrl}/session/${selected.code}/display`,
        judge: `${baseUrl}/session/${selected.code}/judge`,
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/80 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Concurso oral
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            Liga del Saber Franciscana 2026
          </h1>
          <p className="mt-2 text-muted-foreground">
            Configura preguntas, sesión, equipos y enlaces del evento.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 pb-16 sm:px-6">
      {message && (
        <Alert variant={messageVariant}>{message}</Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Preguntas</CardTitle>
          <CardDescription>{questionCount} en el banco de datos</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleImportRepo}
            disabled={pending}
            loading={pending && pendingAction === "import"}
          >
            Importar desde data/
          </Button>
          <label className="cursor-pointer">
            <span className="sr-only">Subir JSON</span>
            <span className={buttonClasses("outline", "default", "inline-flex")}>
              Subir archivo JSON
            </span>
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFile}
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nueva sesión</CardTitle>
          <CardDescription>Código corto para la sala, ej. SF2026</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateSession} className="flex flex-col gap-3 sm:flex-row">
            <Input
              name="code"
              placeholder="Código ej. SF2026"
              className="sm:flex-1"
              required
              pattern="[A-Za-z0-9]+"
            />
            <Button
              type="submit"
              disabled={pending || questionCount === 0}
              className="sm:shrink-0"
              loading={pending && pendingAction === "session"}
            >
              Crear sesión
            </Button>
          </form>
        </CardContent>
      </Card>

      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sesiones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FieldHint>
              Elige la sesión y añade equipos y jurados abajo.
            </FieldHint>
            <Select
              value={selected?.code ?? sessions[0]?.code ?? ""}
              onChange={(e) => setSelectedCode(e.target.value)}
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.code}>
                  {s.code} — {s.teams.length} equipos, {s.judges.length} jurados
                </option>
              ))}
            </Select>

            {selected && (
              <>
                <div className="space-y-3 border-t border-border/60 pt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <SectionTitle>Equipos ({selected.teams.length})</SectionTitle>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() =>
                        document
                          .getElementById("add-team-form")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                    >
                      + Añadir equipo
                    </Button>
                  </div>
                  {selected.teams.length > 0 ? (
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {selected.teams.map((t, i) => (
                        <li
                          key={t.id}
                          className={`rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-foreground ${
                            newTeamHighlight === t.nombre
                              ? "animate-list-item-in ring-2 ring-primary/40"
                              : ""
                          }`}
                        >
                          <span className="font-medium">{i + 1}. {t.nombre}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <FieldHint>
                      Aún no hay equipos. Completa el formulario de abajo y pulsa
                      «Añadir equipo».
                    </FieldHint>
                  )}
                </div>

                <form
                  id="add-team-form"
                  onSubmit={handleAddTeam}
                  className={`space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5 ${
                    teamBtnSuccess ? "animate-form-flash" : ""
                  }`}
                >
                  <SectionTitle>Nuevo equipo</SectionTitle>
                  <FieldHint>
                    Integrantes: tantos como necesites (máx. {MAX_TEAM_MEMBERS}).
                  </FieldHint>
                  <div className="space-y-1.5">
                    <Label htmlFor="team-nombre">Nombre del equipo</Label>
                    <Input
                      id="team-nombre"
                      name="nombre"
                      placeholder="Ej. Los Franciscanos"
                      required
                    />
                  </div>
                  {teamMemberNames.map((name, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={name}
                        onChange={(e) => {
                          const next = [...teamMemberNames];
                          next[i] = e.target.value;
                          setTeamMemberNames(next);
                        }}
                        placeholder={`Integrante ${i + 1}`}
                        className="flex-1"
                      />
                      {teamMemberNames.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`Quitar integrante ${i + 1}`}
                          onClick={() =>
                            setTeamMemberNames(
                              teamMemberNames.filter((_, j) => j !== i),
                            )
                          }
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                  {teamMemberNames.length < MAX_TEAM_MEMBERS && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setTeamMemberNames([...teamMemberNames, ""])
                      }
                    >
                      + Añadir integrante
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={pending}
                    className="w-full"
                    size="lg"
                    loading={pending && pendingAction === "team"}
                    success={teamBtnSuccess}
                  >
                    {pending && pendingAction === "team"
                      ? "Añadiendo…"
                      : teamBtnSuccess
                        ? "¡Listo!"
                        : "Añadir equipo"}
                  </Button>
                </form>

                <div className="space-y-3 border-t border-border/60 pt-6">
                  <SectionTitle>Jurados ({selected.judges.length})</SectionTitle>
                  {selected.judges.length > 0 ? (
                    <ul className="space-y-1.5 text-sm">
                      {selected.judges.map((j) => (
                        <li
                          key={j.id}
                          className={`flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 ${
                            newJudgeHighlight === j.label
                              ? "animate-list-item-in ring-2 ring-primary/40"
                              : ""
                          }`}
                        >
                          <span className="font-medium text-foreground">
                            {j.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            PIN configurado
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <FieldHint>
                      Aún no hay jurados. Añade J1, J2, J3 con un PIN cada uno.
                    </FieldHint>
                  )}
                </div>

                <form
                  onSubmit={handleAddJudge}
                  className={`space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5 ${
                    judgeBtnSuccess ? "animate-form-flash" : ""
                  }`}
                >
                  <SectionTitle>Nuevo jurado</SectionTitle>
                  <FieldHint>PIN privado para entrar en la vista de jurado.</FieldHint>
                  <div className="space-y-1.5">
                    <Label htmlFor="judge-label">Etiqueta</Label>
                    <Input id="judge-label" name="label" placeholder="J1" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="judge-pin">PIN</Label>
                    <Input
                      id="judge-pin"
                      name="pin"
                      type="password"
                      placeholder="Mínimo 4 caracteres"
                      required
                      minLength={4}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={pending}
                    className="w-full sm:w-auto"
                    loading={pending && pendingAction === "judge"}
                    success={judgeBtnSuccess}
                  >
                    {pending && pendingAction === "judge"
                      ? "Guardando…"
                      : judgeBtnSuccess
                        ? "¡Listo!"
                        : "Guardar jurado"}
                  </Button>
                </form>

                {links && (
                  <div className="space-y-4 border-t border-border/60 pt-6">
                    <SectionTitle>Enlaces</SectionTitle>
                    <ul className="space-y-2">
                      <LinkRow
                        label="Moderador"
                        href={links.moderator}
                        onQr={() => showQr("Moderador", links.moderator)}
                      />
                      <LinkRow
                        label="Tablero (proyector)"
                        href={links.display}
                        onQr={() => showQr("Tablero", links.display)}
                      />
                      <LinkRow
                        label="Jurados"
                        href={links.judge}
                        onQr={() => showQr("Jurados", links.judge)}
                      />
                    </ul>

                    {selected.teams.length > 0 && (
                      <div className="space-y-2">
                        <SectionTitle>Equipos</SectionTitle>
                        <ul className="space-y-2">
                          {selected.teams.map((t) => {
                            const teamUrl = `${baseUrl}/session/${selected.code}/team/${t.id}`;
                            return (
                              <LinkRow
                                key={t.id}
                                label={t.nombre}
                                href={teamUrl}
                                onQr={() => showQr(`Equipo ${t.nombre}`, teamUrl)}
                              />
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {qrPreview && (
                      <div
                        className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center shadow-inner"
                        role="region"
                        aria-label="Vista previa del código QR"
                      >
                        <p className="font-semibold text-foreground">
                          {qrPreview.label}
                        </p>
                        <p className="mt-1 break-all text-xs text-muted-foreground">
                          {qrPreview.url}
                        </p>
                        <img
                          src={qrPreview.dataUrl}
                          alt={`Código QR para ${qrPreview.label}`}
                          className="mx-auto mt-4 rounded-xl bg-white p-3 shadow-md"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => setQrPreview(null)}
                        >
                          Cerrar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
