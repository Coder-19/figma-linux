import * as E from "electron";

import * as Const from "Const";
import { isSameCookieDomain } from "Utils/Main";

export class Session {
  private _hasFigmaSession: boolean;
  private assessSessionTimer: NodeJS.Timer;

  constructor() {
    this._hasFigmaSession = null;
    this.assessSessionTimer = null;
  }

  public hasFigmaSession = (): boolean => {
    return this._hasFigmaSession;
  };

  public handleAppReady = () => {
    E.session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      const whitelist = ["fullscreen", "pointerLock"];
      callback(whitelist.includes(permission));
    });
    E.session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders["User-Agent"] = Const.UserAgent.Windows;
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    });

    const defaultUserAgent = E.session.defaultSession.getUserAgent();
    const userAgent = defaultUserAgent.replace(/Figma([^\/]+)\/([^\s]+)/, "Figma$1/$2 Figma/$2");

    E.session.defaultSession.setUserAgent(userAgent);
    E.session.defaultSession.cookies
      .get({
        url: Const.HOMEPAGE,
      })
      .then(cookies => {
        E.session.defaultSession.cookies.on("changed", this.handleCookiesChanged);

        this._hasFigmaSession = !!cookies.find(cookie => {
          return cookie.name === Const.FIGMA_SESSION_COOKIE_NAME;
        });

        console.log("[wm] already signed in?", this._hasFigmaSession);
      })
      .catch((error: Error) =>
        console.error("[wm] failed to get cookies during handleAppReady:", Const.HOMEPAGE, error),
      );
  };

  private handleCookiesChanged = (event: E.Event, cookie: E.Cookie, cause: string, removed: boolean) => {
    if (isSameCookieDomain(cookie.domain || "", Const.PARSED_HOMEPAGE.hostname || "")) {
      if (cookie.name === Const.FIGMA_SESSION_COOKIE_NAME) {
        console.log(`${cookie.name} cookie changed:`, cause, cookie.name, cookie.domain, removed ? "removed" : "");
      }
    }
  };
}
