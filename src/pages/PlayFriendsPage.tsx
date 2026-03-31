import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import {
  ChallengeBadgeButton,
  FriendsStickyHeader,
  initialsFromUsername,
  ProfileSmall,
  QuickActionRow,
  TrophySmall,
} from "@/components/friends/FriendsPlayUi";
import { DraughtLoader, DraughtLoaderButtonContent } from "@/components/ui/DraughtLoader";
import {
  challengesApi,
  socialApi,
  usersApi,
  type FriendRequestItem,
  type GameChallenge,
  type GamePlayerPublic,
  type SocialNotification,
} from "@/lib/api";
import {
  facebookGetLoginStatusToken,
  facebookLoginForToken,
  loadFacebookSdk,
} from "@/lib/facebookSdk";
import { safeReturnTo } from "@/lib/deepLink";
import { DRAUGHT_SOCIAL_REFRESH_EVENT } from "@/hooks/useSocialWebSocket";

function unwrapList<T>(data: { results?: T[] } | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}

const FB_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID?.trim() ?? "";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function PlayFriendsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  /** Notifications `<details>`: open by default; reopen each visit to /play/friends. */
  const [notifSectionOpen, setNotifSectionOpen] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [inviteFlash, setInviteFlash] = useState<string | null>(null);
  const [facebookLinked, setFacebookLinked] = useState(false);
  const [tiktokLinked, setTiktokLinked] = useState(false);
  const [tiktokServerConfigured, setTiktokServerConfigured] = useState(false);
  const [fbSuggestions, setFbSuggestions] = useState<GamePlayerPublic[]>([]);
  const [fbHint, setFbHint] = useState("");
  const [fbBusy, setFbBusy] = useState(false);
  const [fbLinkBusy, setFbLinkBusy] = useState(false);
  const [tiktokBusy, setTiktokBusy] = useState(false);

  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [friends, setFriends] = useState<GamePlayerPublic[]>([]);
  const [opponents, setOpponents] = useState<GamePlayerPublic[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<GamePlayerPublic[]>([]);
  const [searching, setSearching] = useState(false);

  const [frIn, setFrIn] = useState<FriendRequestItem[]>([]);
  const [frOut, setFrOut] = useState<FriendRequestItem[]>([]);
  const [chIn, setChIn] = useState<GameChallenge[]>([]);
  const [chOut, setChOut] = useState<GameChallenge[]>([]);
  /** When true, new challenges use first-to-5 board wins (match) mode. */
  const [challengeAsMatch, setChallengeAsMatch] = useState(false);
  /** When true, created games count for Elo (single board or full match). */
  const [challengeAsRanked, setChallengeAsRanked] = useState(true);
  const [optimisticOutgoingFriendIds, setOptimisticOutgoingFriendIds] = useState<
    number[]
  >([]);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setErr(null);
    try {
      const [
        profRes,
        nRes,
        fRes,
        oRes,
        friRes,
        froRes,
        chiRes,
        choRes,
        tikCfg,
      ] = await Promise.all([
        usersApi.profile(),
        socialApi.notifications(),
        socialApi.friends(),
        socialApi.recentOpponents(),
        socialApi.friendRequestsIncoming(),
        socialApi.friendRequestsOutgoing(),
        challengesApi.incoming(),
        challengesApi.outgoing(),
        socialApi.tiktokConfig().catch(() => ({
          data: { configured: false },
        })),
      ]);
      setFacebookLinked(Boolean(profRes.data.facebook_linked));
      setTiktokLinked(Boolean(profRes.data.tiktok_linked));
      setTiktokServerConfigured(Boolean(tikCfg.data.configured));
      setNotifications(unwrapList(nRes.data));
      setFriends(Array.isArray(fRes.data) ? fRes.data : []);
      setOpponents(Array.isArray(oRes.data) ? oRes.data : []);
      setFrIn(unwrapList(friRes.data));
      setFrOut(unwrapList(froRes.data));
      setChIn(unwrapList(chiRes.data));
      setChOut(unwrapList(choRes.data));
    } catch (e: unknown) {
      const msg =
        e &&
        typeof e === "object" &&
        "message" in e
          ? String((e as { message?: string }).message)
          : "Could not load social data.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => {
      void load();
    };
    window.addEventListener(DRAUGHT_SOCIAL_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(DRAUGHT_SOCIAL_REFRESH_EVENT, onRefresh);
  }, [load]);

  useEffect(() => {
    if (location.pathname === "/play/friends") {
      setNotifSectionOpen(true);
    }
  }, [location.pathname]);

  const qFromUrl = searchParams.get("q");
  useEffect(() => {
    if (qFromUrl?.trim()) {
      setSearchQ(qFromUrl.trim());
    }
  }, [qFromUrl]);

  const oauthCode = searchParams.get("code");
  useEffect(() => {
    if (!oauthCode || !isAuthenticated) return;
    const lockKey = `draught_tiktok_oauth_${oauthCode}`;
    if (sessionStorage.getItem(lockKey)) return;
    const saved = sessionStorage.getItem("draught_tiktok_oauth_state");
    const state = searchParams.get("state");
    if (state && saved !== state) {
      setErr("Invalid TikTok login state. Try Link accounts below.");
      navigate("/play/friends", { replace: true });
      return;
    }
    sessionStorage.setItem(lockKey, "1");
    void (async () => {
      try {
        const { data: cfg } = await socialApi.tiktokConfig();
        const redirect = cfg.redirect_uri;
        if (!redirect) {
          sessionStorage.removeItem(lockKey);
          setErr("TikTok redirect URI is not configured on the server.");
          return;
        }
        await socialApi.linkTikTok({
          code: oauthCode,
          redirect_uri: redirect,
        });
        sessionStorage.removeItem("draught_tiktok_oauth_state");
        navigate("/play/friends", { replace: true });
        await load();
      } catch (e: unknown) {
        sessionStorage.removeItem(lockKey);
        const detail =
          e &&
          typeof e === "object" &&
          "response" in e &&
          (e as { response?: { data?: { detail?: string } } }).response?.data
            ?.detail;
        setErr(typeof detail === "string" ? detail : "TikTok linking failed.");
      }
    })();
  }, [oauthCode, isAuthenticated, navigate, load]);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchHits([]);
      return;
    }
    setSearching(true);
    const t = window.setTimeout(() => {
      void usersApi
        .search(q)
        .then((r) => setSearchHits(r.data))
        .catch(() => setSearchHits([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchQ]);

  const friendIds = new Set(friends.map((u) => u.id));

  useEffect(() => {
    setOptimisticOutgoingFriendIds((ids) => {
      if (ids.length === 0) return ids;
      const confirmed = new Set(frOut.map((r) => r.to_user.id));
      const next = ids.filter((id) => !confirmed.has(id));
      return next.length === ids.length ? ids : next;
    });
  }, [frOut]);

  const pendingOutgoingFriendIds = useMemo(() => {
    const s = new Set(frOut.map((r) => r.to_user.id));
    for (const id of optimisticOutgoingFriendIds) s.add(id);
    return s;
  }, [frOut, optimisticOutgoingFriendIds]);

  const shareOrCopyInvite = useCallback(async () => {
    const qs = challengeAsMatch ? "?match=1" : "";
    const url = `${window.location.origin}/play${qs}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Draught",
          text: "Join me for a game on Draught!",
          url,
        });
        return;
      }
    } catch {
      /* dismissed or blocked */
    }
    try {
      await navigator.clipboard.writeText(url);
      setInviteFlash("Play link copied");
      window.setTimeout(() => setInviteFlash(null), 2200);
    } catch {
      setErr("Could not copy the link.");
    }
  }, [challengeAsMatch]);

  const onMarkAllRead = async () => {
    try {
      await socialApi.markNotificationsRead();
      await load();
    } catch {
      setErr("Could not mark notifications read.");
    }
  };

  const onFriendRequest = async (userId: number) => {
    setErr(null);
    setOptimisticOutgoingFriendIds((prev) =>
      prev.includes(userId) ? prev : [...prev, userId],
    );
    try {
      await socialApi.sendFriendRequest(userId);
      await load();
    } catch (e: unknown) {
      setOptimisticOutgoingFriendIds((prev) =>
        prev.filter((id) => id !== userId),
      );
      const detail =
        e &&
        typeof e === "object" &&
        "response" in e &&
        (e as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail;
      setErr(typeof detail === "string" ? detail : "Friend request failed.");
    }
  };

  const onChallenge = async (userId: number) => {
    setErr(null);
    try {
      await challengesApi.create(userId, {
        ...(challengeAsMatch ? { is_match: true } : {}),
        ...(challengeAsRanked ? { is_ranked: true } : {}),
      });
      await load();
    } catch (e: unknown) {
      const detail =
        e &&
        typeof e === "object" &&
        "response" in e &&
        (e as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail;
      setErr(typeof detail === "string" ? detail : "Could not send challenge.");
    }
  };

  const onAcceptChallenge = async (id: string) => {
    setErr(null);
    try {
      const { data } = await challengesApi.accept(id);
      navigate(`/play/game/${data.game_id}`);
    } catch {
      setErr("Could not accept challenge.");
    }
  };

  const onDeclineChallenge = async (id: string) => {
    try {
      await challengesApi.decline(id);
      await load();
    } catch {
      setErr("Could not decline challenge.");
    }
  };

  const onCancelChallenge = async (id: string) => {
    try {
      await challengesApi.cancel(id);
      await load();
    } catch {
      setErr("Could not cancel challenge.");
    }
  };

  const onLinkFacebook = async () => {
    if (!FB_APP_ID) return;
    setErr(null);
    setFbLinkBusy(true);
    try {
      await loadFacebookSdk(FB_APP_ID);
      let token = await facebookGetLoginStatusToken();
      if (!token) token = await facebookLoginForToken();
      if (!token) {
        setErr("Facebook login was cancelled or failed.");
        return;
      }
      await socialApi.linkFacebook(token);
      await load();
    } catch (e: unknown) {
      const detail =
        e &&
        typeof e === "object" &&
        "response" in e &&
        (e as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail;
      setErr(typeof detail === "string" ? detail : "Could not link Facebook.");
    } finally {
      setFbLinkBusy(false);
    }
  };

  const onUnlinkFacebook = async () => {
    setErr(null);
    try {
      await socialApi.unlinkFacebook();
      setFbSuggestions([]);
      setFbHint("");
      await load();
    } catch {
      setErr("Could not unlink Facebook.");
    }
  };

  const onSuggestionsFacebook = async () => {
    if (!FB_APP_ID) return;
    setErr(null);
    setFbBusy(true);
    try {
      await loadFacebookSdk(FB_APP_ID);
      let token = await facebookGetLoginStatusToken();
      if (!token) token = await facebookLoginForToken();
      if (!token) {
        setErr("Facebook login was cancelled or failed.");
        return;
      }
      const { data } = await socialApi.facebookFriendSuggestions(token);
      setFbSuggestions(data.results);
      setFbHint(data.hint);
    } catch (e: unknown) {
      const detail =
        e &&
        typeof e === "object" &&
        "response" in e &&
        (e as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail;
      setErr(
        typeof detail === "string" ? detail : "Could not load suggestions.",
      );
    } finally {
      setFbBusy(false);
    }
  };

  const onTikTokStart = async () => {
    setErr(null);
    setTiktokBusy(true);
    try {
      const { data } = await socialApi.tiktokConfig();
      if (!data.configured || !data.client_key || !data.redirect_uri) {
        setErr("TikTok login is not configured on the server.");
        return;
      }
      const state = crypto.randomUUID();
      sessionStorage.setItem("draught_tiktok_oauth_state", state);
      const u = new URL("https://www.tiktok.com/v2/auth/authorize/");
      u.searchParams.set("client_key", data.client_key);
      u.searchParams.set("response_type", "code");
      u.searchParams.set("scope", "user.info.basic");
      u.searchParams.set("redirect_uri", data.redirect_uri);
      u.searchParams.set("state", state);
      window.location.assign(u.toString());
    } finally {
      setTiktokBusy(false);
    }
  };

  const onUnlinkTikTok = async () => {
    setErr(null);
    try {
      await socialApi.unlinkTikTok();
      await load();
    } catch {
      setErr("Could not unlink TikTok.");
    }
  };

  /** Non-friend player row (search / suggestions / opponents). */
  const renderDiscoverRow = (u: GamePlayerPublic) => (
    <li
      key={u.id}
      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-header/15 bg-white/55 px-3 py-2.5 dark:bg-sheet/50"
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-peach text-xs font-bold text-text">
          {initialsFromUsername(u.username)}
        </div>
        <span className="truncate font-medium text-text">{u.username}</span>
      </div>
      <span className="flex flex-wrap items-center gap-2">
        {friendIds.has(u.id) ? (
          <span className="text-xs text-muted">Friends</span>
        ) : pendingOutgoingFriendIds.has(u.id) ? (
          <span className="text-xs font-medium text-muted">Pending</span>
        ) : (
          <button
            type="button"
            onClick={() => void onFriendRequest(u.id)}
            className="rounded-full bg-peach px-3 py-1.5 text-xs font-semibold text-text"
          >
            Add friend
          </button>
        )}
        <ChallengeBadgeButton
          onClick={() => void onChallenge(u.id)}
          label={`Challenge ${u.username}`}
        />
      </span>
    </li>
  );

  if (authLoading) {
    return <DraughtLoader variant="fullscreen" tone="onLight" ariaLabel="Loading" />;
  }

  if (!isAuthenticated) {
    const ret = safeReturnTo("/play/friends");
    return (
      <div className="flex min-h-[100dvh] flex-col bg-cream px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link to="/play" className="mb-4 text-sm font-semibold text-text hover:underline">
          ← Play menu
        </Link>
        <h1 className="font-display text-3xl text-text">Play a friend</h1>
        <p className="mt-3 text-sm text-muted">
          Sign in to invite players, add friends, and get notifications.
        </p>
        <Link
          to={`/auth/login?returnTo=${encodeURIComponent(ret)}`}
          className="mt-6 inline-flex w-fit rounded-full bg-active px-6 py-3 text-sm font-semibold text-text shadow-sm"
        >
          Log in
        </Link>
      </div>
    );
  }

  const hasActivity =
    frIn.length + frOut.length + chIn.length + chOut.length > 0;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream bg-mesh-radial dark:bg-mesh-radial-dark">
      <FriendsStickyHeader onCopyInvite={() => void shareOrCopyInvite()} />

      <div className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 pb-6 pt-4">
        <div className="space-y-2 rounded-xl border border-header/15 bg-sheet/40 px-3 py-2.5">
          <label className="flex cursor-pointer items-start gap-2 text-xs text-text">
            <input
              type="checkbox"
              checked={challengeAsRanked}
              onChange={(e) => setChallengeAsRanked(e.target.checked)}
              className="mt-0.5 rounded border-header/40 text-active focus:ring-active"
            />
            <span>
              <strong className="font-semibold">Ranked</strong>
              <span className="text-muted">
                {" "}
                — Elo changes when the board or match ends (uncheck for casual)
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-xs text-text">
            <input
              type="checkbox"
              checked={challengeAsMatch}
              onChange={(e) => setChallengeAsMatch(e.target.checked)}
              className="mt-0.5 rounded border-header/40 text-active focus:ring-active"
            />
            <span>
              <strong className="font-semibold">Match mode</strong>
              <span className="text-muted"> — first to 5 board wins</span>
            </span>
          </label>
        </div>
        <p className="text-center text-xs text-muted">
          Browser push:{" "}
          <Link to="/more" className="font-semibold text-text underline-offset-2 hover:underline">
            More → Settings
          </Link>
        </p>

        {inviteFlash ? (
          <p className="rounded-xl border border-header/20 bg-sheet/80 px-3 py-2 text-center text-sm font-medium text-text">
            {inviteFlash}
          </p>
        ) : null}

        {err ? (
          <p className="rounded-xl border border-red-200/80 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {err}
          </p>
        ) : null}

        <div className="space-y-2">
          <QuickActionRow
            label="Find players"
            onClick={() => searchInputRef.current?.focus()}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="10" cy="10" r="6" />
                <path d="M14 14l6 6" strokeLinecap="round" />
                <path d="M8 15v3h3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <QuickActionRow
            label="Facebook friends"
            onClick={() => scrollToId("section-connect")}
            icon={
              <span className="text-lg font-bold text-brand-fb" aria-hidden>
                f
              </span>
            }
          />
          <QuickActionRow
            label="TikTok"
            onClick={() => scrollToId("section-connect")}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
              </svg>
            }
          />
          <QuickActionRow
            label="Invite friends"
            onClick={() => void shareOrCopyInvite()}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 19h16M7 16l3-9 3 5 2-4 3 8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="5" r="3" />
              </svg>
            }
          />
          <QuickActionRow
            label="Recent opponents"
            onClick={() => scrollToId("section-opponents")}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" strokeLinecap="round" />
              </svg>
            }
          />
        </div>

        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" strokeLinecap="round" />
            </svg>
          </span>
          <input
            ref={searchInputRef}
            id="friend-search"
            type="search"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search by name or username"
            autoComplete="off"
            className="w-full rounded-2xl border border-header/25 bg-white/90 py-3.5 pl-11 pr-4 text-sm text-text placeholder:text-muted shadow-inner dark:bg-sheet/80"
          />
        </div>

        {searching ? (
          <div className="px-1 py-1">
            <DraughtLoader variant="inline" label="Searching…" />
          </div>
        ) : searchHits.length > 0 ? (
          <ul className="space-y-2">{searchHits.map((u) => renderDiscoverRow(u))}</ul>
        ) : searchQ.trim().length >= 2 ? (
          <p className="text-xs text-muted">No matches.</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold text-text">Friends</h2>
            <span className="rounded-full bg-avatar px-2.5 py-0.5 text-sm font-bold text-text">
              {friends.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
            <Link
              to="/leaderboard"
              className="flex items-center gap-1 text-sm font-semibold text-text underline-offset-2 hover:underline"
            >
              <TrophySmall />
              Leaderboard
            </Link>
            <Link
              to="/home/profile"
              className="flex items-center gap-1 text-sm font-semibold text-text underline-offset-2 hover:underline"
            >
              <ProfileSmall />
              Your stats
            </Link>
          </div>
        </div>

        {loading ? (
          <DraughtLoader variant="section" label="Loading friends" className="py-6" />
        ) : friends.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-header/25 bg-white/40 px-4 py-6 text-center text-sm text-muted dark:bg-sheet/35">
            No friends yet — use search or Connect accounts below.
          </p>
        ) : (
          <ul className="space-y-2">
            {friends.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-2xl border border-header/15 bg-white/55 py-2 pl-2 pr-2 dark:bg-sheet/50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-header text-sm font-bold text-text">
                  {initialsFromUsername(u.username)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text">{u.username}</p>
                  <p className="text-xs text-muted">Friend</p>
                </div>
                <ChallengeBadgeButton
                  onClick={() => void onChallenge(u.id)}
                  label={`Challenge ${u.username}`}
                />
              </li>
            ))}
          </ul>
        )}

        <details
          className="group rounded-2xl border border-header/20 bg-white/45 open:bg-white/55 dark:border-header/30 dark:bg-sheet/45 dark:open:bg-sheet/55"
          open={hasActivity}
        >
          <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-text [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between">
              Requests &amp; invites
              {(frIn.length + frOut.length + chIn.length + chOut.length > 0) ? (
                <span className="rounded-full bg-header/20 px-2 py-0.5 text-xs">
                  {frIn.length + frOut.length + chIn.length + chOut.length}
                </span>
              ) : (
                <span className="text-xs font-normal text-muted">None</span>
              )}
            </span>
          </summary>
          <div className="space-y-4 border-t border-header/10 px-4 pb-4 pt-3 text-sm">
            {chIn.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Game invites (incoming)
                </p>
                <ul className="space-y-2">
                  {chIn.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-header/15 bg-sheet/60 px-3 py-2"
                    >
                      <span>
                        From <strong>{c.from_user.username}</strong>
                        {c.is_ranked ? (
                          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
                            · Ranked
                          </span>
                        ) : null}
                        {c.is_match ? (
                          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                            · Match
                          </span>
                        ) : null}
                      </span>
                      <span className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void onAcceptChallenge(c.id)}
                          className="rounded-full bg-success px-3 py-1 text-xs font-semibold text-text"
                        >
                          Play
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeclineChallenge(c.id)}
                          className="rounded-full border border-header/30 px-3 py-1 text-xs font-semibold"
                        >
                          Decline
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {chOut.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Game invites (outgoing)
                </p>
                <ul className="space-y-2">
                  {chOut.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-header/15 bg-sheet/60 px-3 py-2"
                    >
                      <span>
                        To <strong>{c.to_user.username}</strong>
                        {c.is_ranked ? (
                          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
                            · Ranked
                          </span>
                        ) : null}
                        {c.is_match ? (
                          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                            · Match
                          </span>
                        ) : null}
                        {c.status === "accepted" ? (
                          <span className="ml-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                            · Accepted
                          </span>
                        ) : null}
                      </span>
                      <span className="flex flex-wrap gap-2">
                        {c.status === "accepted" &&
                        typeof c.game_id === "string" &&
                        c.game_id.length > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/play/game/${encodeURIComponent(c.game_id!)}`)
                            }
                            className="rounded-full bg-success px-3 py-1 text-xs font-semibold text-text"
                          >
                            Join game
                          </button>
                        ) : c.status === "pending" ? (
                          <button
                            type="button"
                            onClick={() => void onCancelChallenge(c.id)}
                            className="rounded-full border border-header/30 px-3 py-1 text-xs font-semibold"
                          >
                            Cancel
                          </button>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {frIn.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Friend requests (incoming)
                </p>
                <ul className="space-y-2">
                  {frIn.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-header/15 bg-sheet/60 px-3 py-2"
                    >
                      <strong>{r.from_user.username}</strong>
                      <span className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await socialApi.acceptFriendRequest(r.id);
                            await load();
                          }}
                          className="rounded-full bg-success px-3 py-1 text-xs font-semibold text-text"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await socialApi.declineFriendRequest(r.id);
                            await load();
                          }}
                          className="rounded-full border border-header/30 px-3 py-1 text-xs font-semibold"
                        >
                          Decline
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {frOut.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Friend requests (outgoing)
                </p>
                <ul className="space-y-2">
                  {frOut.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-header/15 bg-sheet/60 px-3 py-2"
                    >
                      <span>
                        Pending → <strong>{r.to_user.username}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          await socialApi.cancelFriendRequest(r.id);
                          await load();
                        }}
                        className="rounded-full border border-header/30 px-3 py-1 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {!hasActivity ? (
              <p className="text-muted">No pending requests or invites.</p>
            ) : null}
          </div>
        </details>

        <div id="section-notifications" className="scroll-mt-4">
        <details
          className="rounded-2xl border border-header/20 bg-white/45 open:bg-white/55 dark:border-header/30 dark:bg-sheet/45 dark:open:bg-sheet/55"
          open={notifSectionOpen}
          onToggle={(e) => setNotifSectionOpen(e.currentTarget.open)}
        >
          <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-text [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between">
              Notifications
              {notifications.some((n) => n.read_at == null) ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void onMarkAllRead();
                  }}
                  className="text-xs font-semibold text-text underline"
                >
                  Mark all read
                </button>
              ) : null}
            </span>
          </summary>
          <div className="border-t border-header/10 px-4 pb-4 pt-3">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted">No notifications yet.</p>
            ) : (
              <ul className="space-y-2">
                {notifications.map((n) => {
                  const notifGameId =
                    typeof n.payload?.game_id === "string"
                      ? n.payload.game_id
                      : null;
                  const gs = n.game_status;
                  const isChallengeAccepted = n.kind === "challenge_accepted";
                  const gameEnded =
                    isChallengeAccepted &&
                    Boolean(notifGameId) &&
                    (gs === "finished" || gs === "abandoned");
                  /** Server could not find the game row (deleted). */
                  const gameMissing =
                    isChallengeAccepted &&
                    Boolean(notifGameId) &&
                    gs === null;
                  /** Join only while the match is live; `undefined` = older API without game_status. */
                  const showJoinGame =
                    isChallengeAccepted &&
                    Boolean(notifGameId) &&
                    !gameEnded &&
                    !gameMissing &&
                    (gs === undefined ||
                      gs === "active" ||
                      gs === "waiting");
                  return (
                    <li
                      key={n.id}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        n.read_at
                          ? "border-header/10 bg-white/40 dark:bg-sheet/35"
                          : "border-header/25 bg-sheet/90"
                      }`}
                    >
                      <p className="font-semibold text-text">{n.title}</p>
                      {n.body ? <p className="text-muted">{n.body}</p> : null}
                      {gameEnded ? (
                        <p className="mt-2 text-xs font-semibold text-muted">
                          Game ended — review from history if needed.
                        </p>
                      ) : gameMissing ? (
                        <p className="mt-2 text-xs text-muted">
                          This game is no longer available.
                        </p>
                      ) : showJoinGame && notifGameId ? (
                        <Link
                          to={`/play/game/${encodeURIComponent(notifGameId)}`}
                          className="mt-2 inline-flex rounded-full bg-success px-3 py-1.5 text-xs font-semibold text-text"
                        >
                          Join game
                        </Link>
                      ) : null}
                      <p className="mt-1 text-[10px] uppercase text-muted">
                        {n.kind.replace(/_/g, " ")}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </details>
        </div>

        <div id="section-connect" className="scroll-mt-4 space-y-3 rounded-2xl border border-header/20 bg-sheet/60 p-4">
          <h3 className="font-display text-lg font-semibold text-text">Connect accounts</h3>
          <p className="text-xs leading-relaxed text-muted">
            Facebook: link and load suggestions (friends who also use this app). TikTok: link profile only.
          </p>

          <div className="rounded-xl border border-header/10 bg-white/45 p-3 dark:bg-sheet/40">
            <p className="text-xs font-semibold text-text">Facebook</p>
            {!FB_APP_ID ? (
              <p className="mt-1 text-xs text-muted">
                Set <code className="rounded bg-header/10 px-1">VITE_FACEBOOK_APP_ID</code> and server
                keys to enable.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">Status: {facebookLinked ? "linked" : "not linked"}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {FB_APP_ID ? (
                <>
                  <button
                    type="button"
                    disabled={fbLinkBusy || facebookLinked}
                    onClick={() => void onLinkFacebook()}
                    className="inline-flex items-center justify-center rounded-full bg-brand-fb px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    <DraughtLoaderButtonContent
                      loading={fbLinkBusy}
                      loadingText="Connecting…"
                      idleText="Link Facebook"
                      tone="onDark"
                    />
                  </button>
                  {facebookLinked ? (
                    <button
                      type="button"
                      onClick={() => void onUnlinkFacebook()}
                      className="rounded-full border border-header/30 px-3 py-1.5 text-xs font-semibold"
                    >
                      Unlink
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={fbBusy || !facebookLinked}
                    onClick={() => void onSuggestionsFacebook()}
                    className="inline-flex items-center justify-center rounded-full bg-peach px-3 py-1.5 text-xs font-semibold text-text disabled:opacity-50"
                  >
                    <DraughtLoaderButtonContent
                      loading={fbBusy}
                      loadingText="Loading…"
                      idleText="Load suggestions"
                      tone="onLight"
                    />
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {fbHint ? <p className="text-xs text-muted">{fbHint}</p> : null}
          {fbSuggestions.length > 0 ? (
            <ul className="space-y-2">{fbSuggestions.map((u) => renderDiscoverRow(u))}</ul>
          ) : null}

          <div className="rounded-xl border border-header/10 bg-white/45 p-3 dark:bg-sheet/40">
            <p className="text-xs font-semibold text-text">TikTok</p>
            {!tiktokServerConfigured ? (
              <p className="mt-1 text-xs text-muted">Configure TikTok keys and redirect on the server.</p>
            ) : (
              <p className="mt-1 text-xs text-muted">Status: {tiktokLinked ? "linked" : "not linked"}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {tiktokServerConfigured ? (
                <>
                  <button
                    type="button"
                    disabled={tiktokBusy || tiktokLinked}
                    onClick={() => void onTikTokStart()}
                    className="inline-flex items-center justify-center rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
                  >
                    <DraughtLoaderButtonContent
                      loading={tiktokBusy}
                      loadingText="Redirecting…"
                      idleText="Link TikTok"
                      tone="onDark"
                    />
                  </button>
                  {tiktokLinked ? (
                    <button
                      type="button"
                      onClick={() => void onUnlinkTikTok()}
                      className="rounded-full border border-header/30 px-3 py-1.5 text-xs font-semibold"
                    >
                      Unlink
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div id="section-opponents" className="scroll-mt-4 pb-4">
          <h3 className="mb-2 font-display text-lg font-semibold text-text">Recent opponents</h3>
          {opponents.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-header/25 bg-white/35 px-4 py-5 text-center text-sm text-muted dark:bg-sheet/30">
              Finish an online game vs another player to see them here.
            </p>
          ) : (
            <ul className="space-y-2">{opponents.map((u) => renderDiscoverRow(u))}</ul>
          )}
        </div>
      </div>
    </div>
  );
}
