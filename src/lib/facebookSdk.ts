/**
 * Facebook JS SDK — used only for Login + `user_friends` (friend suggestions).
 * Set `VITE_FACEBOOK_APP_ID` and create a Meta app with Facebook Login.
 */

const FB_SDK = "https://connect.facebook.net/en_US/sdk.js";

type FBAuthResponse = { accessToken?: string } | undefined;

export type FBLoginResponse = {
  authResponse?: FBAuthResponse;
};

export type FacebookGlobal = {
  init: (opts: {
    appId: string;
    cookie?: boolean;
    xfbml?: boolean;
    version: string;
  }) => void;
  login: (
    cb: (r: FBLoginResponse) => void,
    opts?: { scope?: string },
  ) => void;
  getLoginStatus: (cb: (r: FBLoginResponse) => void) => void;
};

declare global {
  interface Window {
    FB?: FacebookGlobal;
    fbAsyncInit?: () => void;
  }
}

export function loadFacebookSdk(appId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    if (window.FB) {
      resolve();
      return;
    }
    window.fbAsyncInit = () => {
      window.FB!.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v19.0",
      });
      resolve();
    };
    const id = "facebook-jssdk";
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = FB_SDK;
    s.async = true;
    s.onerror = () => reject(new Error("Facebook SDK failed to load"));
    document.body.appendChild(s);
  });
}

function tokenFromResponse(r: FBLoginResponse): string | null {
  return r.authResponse?.accessToken ?? null;
}

/** Opens Facebook Login and returns a user access token (may prompt for permissions). */
export function facebookLoginForToken(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!window.FB) {
      resolve(null);
      return;
    }
    window.FB.login(
      (response: FBLoginResponse) => {
        resolve(tokenFromResponse(response));
      },
      { scope: "public_profile,user_friends" },
    );
  });
}

/** Uses an existing session cookie (if any) without a login popup. */
export function facebookGetLoginStatusToken(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!window.FB) {
      resolve(null);
      return;
    }
    window.FB.getLoginStatus((response: FBLoginResponse) => {
      resolve(tokenFromResponse(response));
    });
  });
}
