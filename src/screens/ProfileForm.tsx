import { useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { EVENT } from "../../shared/event";
import { LIMITS, LOOKING_FOR, ROLE_TAGS } from "../../shared/types";
import type { MyProfile, ProfileInput } from "../../shared/types";
import { Avatar } from "../components/Avatar";
import { TopBar } from "../components/Brand";
import { ChipPicker } from "../components/Chips";
import { SkillPicker } from "../components/SkillPicker";
import { SKILL_LIMITS } from "../../shared/skills";
import { wantsLabel } from "../lib/strength";
import { IconCamera, IconClose } from "../components/icons";
import { prepPhoto } from "../lib/image";

export type FormResult = { input: ProfileInput; photo: Blob | null };

export function ProfileForm({
  initial,
  mode,
  onSubmit,
  onCancel,
}: {
  initial?: MyProfile;
  mode: "create" | "edit";
  onSubmit: (r: FormResult) => Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [findMe, setFindMe] = useState(initial?.findMe ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [lookingFor, setLookingFor] = useState<string[]>(initial?.lookingFor ?? []);
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);
  const [wantsSkills, setWantsSkills] = useState<string[]>(initial?.wantsSkills ?? []);
  // Creating a card asks only for the basics. Everything else comes later, one step at a time.
  const full = mode === "edit";
  const [linkedin, setLinkedin] = useState(initial?.links.linkedin ?? "");
  const [x, setX] = useState(initial?.links.x ?? "");
  const [website, setWebsite] = useState(initial?.links.website ?? "");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.photo ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    try {
      const blob = await prepPhoto(file);
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
    } catch {
      setError("Couldn't read that photo. Try another.");
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Add your name");
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        input: full
          ? { name, title, company, findMe, bio, tags, lookingFor, skills, wantsSkills, links: { linkedin, x, website } }
          : { name, tags },
        photo,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-full flex-col bg-paper">
      <div className="bg-ink pt-safe">
        <TopBar
          right={
            onCancel && (
              <button type="button" onClick={onCancel} className="-mr-2 p-2 text-paper" aria-label="Close">
                <IconClose />
              </button>
            )
          }
        />
      </div>

      <div className="flex-1 px-5 pb-36">
        <h1 className="pt-7 font-display text-[40px] leading-none">{full ? "Edit your card" : "Make your card"}</h1>
        {!full && <p className="mt-2 text-[16px] text-muted">Just the basics. You can add more later.</p>}

        <div className="mt-6 flex items-center gap-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="press relative" aria-label="Add photo">
            {preview ? (
              <img src={preview} alt="" className="pop size-24 border-2 border-ink object-cover" />
            ) : name ? (
              <Avatar name={name} photo={null} seed={name} size={96} className="pop" />
            ) : (
              <div className="pop grid size-24 place-items-center border-2 border-ink bg-amber">
                <IconCamera width={30} height={30} />
              </div>
            )}
            <span className="absolute -right-2 -bottom-2 grid size-9 place-items-center border-2 border-paper bg-ink text-paper">
              <IconCamera width={17} height={17} />
            </span>
          </button>
          <p className="text-[15px] leading-snug text-muted">
            {preview ? "Tap to change." : "Add a clear face photo. It's how people spot you."}
          </p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </div>

        <Section>
          <Field label="Name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={LIMITS.name} autoComplete="name" placeholder="Ada Okafor" className={inputCls} />
          </Field>
          {full && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role">
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.title} placeholder="Android Engineer" className={inputCls} />
              </Field>
              <Field label="Company">
                <input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={LIMITS.company} autoComplete="organization" placeholder="Moniepoint" className={inputCls} />
              </Field>
            </div>
          )}
        </Section>

        <Section title="I am" hint="Up to 3">
          <ChipPicker options={ROLE_TAGS} value={tags} onChange={setTags} max={3} />
        </Section>

        {full && (
          <>
        <Section title="What I work with" hint={`Up to ${SKILL_LIMITS.have}`}>
          <SkillPicker value={skills} onChange={setSkills} max={SKILL_LIMITS.have} tags={tags} />
        </Section>

        <Section title="I'm looking for" hint="Up to 4">
          <ChipPicker options={LOOKING_FOR} value={lookingFor} onChange={setLookingFor} max={4} />
        </Section>

        <Section title={wantsLabel(lookingFor)} hint={`Optional, up to ${SKILL_LIMITS.want}`}>
          <SkillPicker value={wantsSkills} onChange={setWantsSkills} max={SKILL_LIMITS.want} tags={tags} placeholder="e.g. Kubernetes, PyTorch, Fundraising" />
        </Section>

        <Section title="Where can people find you?" hint="Update it as you move.">
          <input value={findMe} onChange={(e) => setFindMe(e.target.value)} maxLength={LIMITS.findMe} placeholder="Hall B, row 3, green hoodie" className={inputCls} />
        </Section>

        <Section title="About you">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={LIMITS.bio}
            rows={3}
            placeholder="Building offline-first apps with Kotlin. Ask me about Compose."
            className={`${inputCls} h-auto resize-none py-3 leading-snug`}
          />
        </Section>

        <Section title="Links">
          <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} inputMode="url" autoCapitalize="off" placeholder="linkedin.com/in/you" className={inputCls} />
          <input value={x} onChange={(e) => setX(e.target.value)} inputMode="url" autoCapitalize="off" placeholder="x.com/you" className={inputCls} />
          <input value={website} onChange={(e) => setWebsite(e.target.value)} inputMode="url" autoCapitalize="off" placeholder="github.com/you or yoursite.com" className={inputCls} />
        </Section>
          </>
        )}

        <p className="mt-7 text-[13px] text-muted">
          Your card is public to people at {EVENT.name}. Your exact location is never shown to anyone.
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper px-5 pt-3 pb-safe">
        {error && <p className="mb-2 text-[14px] font-medium text-g-red">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="press pop mb-4 h-14 w-full border-2 border-ink bg-ink text-[17px] font-semibold text-paper disabled:opacity-60"
        >
          {busy ? "Saving…" : mode === "create" ? "Show me who's around" : "Save"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "h-12 w-full border-2 border-ink bg-card px-3.5 text-ink placeholder:text-ink/35 outline-none focus:bg-white focus:shadow-[3px_3px_0_var(--color-amber)]";

function Section({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mt-7 grid gap-3">
      {title && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 className="shrink-0 font-display text-[22px] leading-tight">{title}</h2>
          {hint && <span className="text-[13px] text-muted">{hint}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[12px] font-semibold tracking-wide text-muted uppercase">
        {label}
        {required && <span className="text-flame"> *</span>}
      </span>
      {children}
    </label>
  );
}
