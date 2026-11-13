import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { MyProfile, NearbyPerson, PersonLite } from "../shared/types";
import { Avatar } from "./components/Avatar";
import { IconChat, IconRadar, IconSpark, IconUser } from "./components/icons";
import { PersonSheet } from "./components/PersonSheet";
import { where } from "./components/format";
import { api, ApiError, getIdentity, readRestoreHash, setIdentity } from "./lib/api";
import type { Identity } from "./lib/api";
import { useNearby } from "./lib/useNearby";
import { Chat } from "./screens/Chat";
import { Me } from "./screens/Me";
import { Messages } from "./screens/Messages";
import { Nearby } from "./screens/Nearby";
import { ProfileForm } from "./screens/ProfileForm";
import type { FormResult } from "./screens/ProfileForm";
import { PublicProfile } from "./screens/PublicProfile";
import { Welcome } from "./screens/Welcome";
import { Boost } from "./screens/Boost";
import { InstallSheet } from "./components/InstallSheet";
import { alreadyAsked, canInstall, markAsked } from "./lib/install";
import { loadHidden } from "./lib/hiddenIntros";

const CACHE = "connect.me";
const SEEN_INTROS = "connect.introsSeen";
const TOAST_GAP_MS = 2 * 60_000; // at most one intro pop-up every 2 min

function load<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown) {
  try {
    if (v == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // ignore
  }
}

export default function App() {
  const [path, setPath] = useState(location.pathname);
  const publicId = path.match(/^\/p\/([a-z0-9]+)/)?.[1];

  const [identity, setId] = useState<Identity | null>(() => {
    const restored = readRestoreHash();
    if (restored) {
      setIdentity(restored);
      save(CACHE, null);
      return restored;
    }
    return getIdentity();
  });
  const [me, setMe] = useState<MyProfile | null>(() => (identity ? load<MyProfile | null>(CACHE, null) : null));
  const [started, setStarted] = useState(false);

  const saveMe = useCallback((p: MyProfile | null) => {
    setMe(p);
    save(CACHE, p);
  }, []);

  // Refresh my profile from the server. Drop identity if it's gone.
  useEffect(() => {
    if (!identity) return;
    api
      .me(identity)
      .then(saveMe)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          setIdentity(null);
          setId(null);
          saveMe(null);
        }
      });
  }, [identity, saveMe]);

  async function create({ input, photo }: FormResult) {
    const res = await api.create(input);
    const id = { id: res.id, secret: res.secret };
    setIdentity(id);
    let profile = res.profile;
    if (photo) {
      const { photo: url } = await api.photo(id, photo).catch(() => ({ photo: null }));
      profile = { ...profile, photo: url };
    }
    saveMe(profile);
    setId(id);
  }

  if (publicId) {
    return (
      <PublicProfile
        id={publicId}
        onOpenApp={() => {
          history.pushState(null, "", "/");
          setPath("/");
        }}
      />
    );
  }

  if (!identity || !me) {
    if (identity && !me) return <div className="h-full bg-ink" />;
    return started ? <ProfileForm mode="create" onSubmit={create} /> : <Welcome
        onStart={() => setStarted(true)}
        onRestore={(id) => {
          setIdentity(id);
          save(CACHE, null);
          setId(id);
        }}
      />;
  }

  return <Main identity={identity} me={me} saveMe={saveMe} onSignedOut={() => setId(null)} />;
}

type Tab = "nearby" | "messages" | "me";

function Main({
  identity,
  me,
  saveMe,
  onSignedOut,
}: {
  identity: Identity;
  me: MyProfile;
  saveMe: (p: MyProfile | null) => void;
  onSignedOut: () => void;
}) {
  const [tab, setTab] = useState<Tab>("nearby");
  const [editing, setEditing] = useState(false);
  const [focusFindMe, setFocusFindMe] = useState(false);
  const [picked, setPicked] = useState<NearbyPerson | null>(null);
  const [chatWith, setChatWith] = useState<PersonLite | null>(null);
  const [toast, setToast] = useState<NearbyPerson | null>(null);
  const [boosting, setBoosting] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const lastToast = useRef(0);

  // Ask to install once, after a first good moment (an intro or a chat).
  const maybeAskInstall = useCallback(() => {
    if (alreadyAsked() || !canInstall()) return;
    markAsked();
    setTimeout(() => setInstallOpen(true), 800);
  }, []);
  const nearby = useNearby(identity);
  const people = nearby.result?.people ?? [];
  const unread = nearby.result?.unread ?? 0;

  // Pop an intro when a strong match comes near, once per person.
  useEffect(() => {
    const r = nearby.result;
    if (!r?.intros.length || Date.now() - lastToast.current < TOAST_GAP_MS) return;
    const seen = new Set([...load<string[]>(SEEN_INTROS, []), ...loadHidden()]);
    // Only pop up for matches you could walk over to now.
    const fresh = r.intros.find((p) => (p.band === "steps" || p.band === "near") && !seen.has(p.id));
    if (!fresh) return;
    seen.add(fresh.id);
    save(SEEN_INTROS, [...seen]);
    lastToast.current = Date.now();
    setToast(fresh);
    navigator.vibrate?.(30);
    const t = setTimeout(() => {
      setToast(null);
      maybeAskInstall();
    }, 7000);
    return () => clearTimeout(t);
  }, [nearby.result, maybeAskInstall]);

  async function edit({ input, photo }: FormResult) {
    let p = await api.update(identity, input);
    if (photo) p = { ...p, photo: (await api.photo(identity, photo)).photo };
    saveMe(p);
    setEditing(false);
    void nearby.refresh();
  }

  const openChat = (p: PersonLite) => {
    setPicked(null);
    setToast(null);
    setChatWith({ id: p.id, name: p.name, title: p.title, company: p.company, photo: p.photo });
  };

  return (
    <div className="relative h-full">
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="h-full overflow-y-auto overscroll-contain"
        >
          {tab === "nearby" ? (
            <Nearby
              me={me}
              identity={identity}
              nearby={nearby}
              onPick={setPicked}
              onMessage={openChat}
              onBoost={() => setBoosting(true)}
            />
          ) : tab === "messages" ? (
            <Messages identity={identity} unread={unread} onOpen={openChat} />
          ) : (
            <Me
              me={me}
              identity={identity}
              focusFindMe={focusFindMe}
              onSaveFindMe={async (findMe) => {
                saveMe(await api.update(identity, { findMe }));
                setFocusFindMe(false);
              }}
              onToggleVisible={async () => {
                saveMe({ ...me, visible: !me.visible });
                saveMe(await api.update(identity, { visible: !me.visible }));
              }}
              onEdit={() => setEditing(true)}
              onDelete={async () => {
                await api.remove(identity);
                setIdentity(null);
                saveMe(null);
                onSignedOut();
              }}
            />
          )}
        </motion.main>
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper pb-safe">
        <div className="mx-auto flex max-w-md">
          <TabButton active={tab === "nearby"} onClick={() => setTab("nearby")} label="Nearby">
            <IconRadar />
          </TabButton>
          <TabButton active={tab === "messages"} onClick={() => setTab("messages")} label="Messages" badge={unread}>
            <IconChat />
          </TabButton>
          <TabButton active={tab === "me"} onClick={() => setTab("me")} label="Me">
            <IconUser />
          </TabButton>
        </div>
      </nav>

      <PersonSheet person={picked} identity={identity} myName={me.name} onClose={() => setPicked(null)} onMessage={openChat} />

      <AnimatePresence>
        {toast && (
          <motion.button
            initial={{ y: -120 }}
            animate={{ y: 0 }}
            exit={{ y: -120 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            onClick={() => {
              setPicked(toast);
              setToast(null);
            }}
            className="pop fixed inset-x-3 top-[calc(env(safe-area-inset-top)+10px)] z-40 flex items-center gap-3 border-2 border-ink bg-amber p-3 text-left"
          >
            <Avatar name={toast.name} photo={toast.photo} seed={toast.id} size={46} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[12px] font-semibold tracking-wide uppercase">
                <IconSpark width={12} height={12} /> Intro · {where(toast)}
              </div>
              <div className="text-[15px] leading-snug">
                Meet <b>{toast.name}</b>. {toast.reasons[0]}
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chatWith && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
            className="fixed inset-0 z-50"
          >
            <Chat
              identity={identity}
              myName={me.name}
              person={chatWith}
              onBack={() => {
                setChatWith(null);
                void nearby.refresh();
                maybeAskInstall();
              }}
              onOpenProfile={
                people.some((p) => p.id === chatWith.id)
                  ? () => {
                      const p = people.find((x) => x.id === chatWith.id)!;
                      setChatWith(null);
                      setPicked(p);
                    }
                  : undefined
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {boosting && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-0 z-50"
          >
            <Boost
              me={me}
              onSave={async (input) => {
                saveMe(await api.update(identity, input));
              }}
              onClose={() => {
                setBoosting(false);
                void nearby.refresh();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <InstallSheet open={installOpen} identity={identity} onClose={() => setInstallOpen(false)} />

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-paper"
          >
            <ProfileForm mode="edit" initial={me} onSubmit={edit} onCancel={() => setEditing(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  badge = 0,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-1 flex-col items-center gap-0.5 pt-2.5 pb-2 text-[11px] font-semibold tracking-wide ${
        active ? "text-ink" : "text-ink/40"
      }`}
    >
      {active && <span className="absolute inset-x-6 top-0 h-[3px] bg-amber" />}
      <span className="relative">
        {children}
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-3 grid h-[18px] min-w-[18px] place-items-center bg-g-red px-1 text-[11px] text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      {label}
    </button>
  );
}
