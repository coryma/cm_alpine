import type { Env } from "../env";

const SESSION_COOKIE_NAME = "alpine_member_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const MEMBER_INDEX_KEY = "member-index";

interface MemberDefaultAddress {
  recipient: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  postalCode: string;
}

interface MemberProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  joinedAt: string;
  defaultAddress: MemberDefaultAddress | null;
  isAdmin: boolean;
}

interface StoredMemberRecord extends Omit<MemberProfile, "isAdmin"> {
  passwordHash: string;
}

interface SessionRecord {
  memberId: string;
  expiresAt: string;
}

interface RegisterPayload {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
}

interface LoginPayload {
  email?: string;
  password?: string;
}

interface UpdateMemberPayload {
  fullName?: string;
  phone?: string;
  defaultAddress?: Partial<MemberDefaultAddress> | null;
}

export class StorefrontAccountStore {
  private readonly adminEmails: Set<string>;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {
    this.adminEmails = resolveAdminMemberEmails(this.env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/auth/register" && request.method === "POST") {
      return this.handleRegister(request);
    }

    if (url.pathname === "/auth/login" && request.method === "POST") {
      return this.handleLogin(request);
    }

    if (url.pathname === "/auth/logout" && request.method === "POST") {
      return this.handleLogout(request);
    }

    if (url.pathname === "/members/me" && request.method === "GET") {
      return this.handleGetCurrentMember(request);
    }

    if (url.pathname === "/members/me" && request.method === "PATCH") {
      return this.handleUpdateCurrentMember(request);
    }

    if (url.pathname === "/members" && request.method === "GET") {
      return this.handleListMembers(request);
    }

    if (url.pathname === "/members" && request.method === "POST") {
      return this.handleManageMember(request);
    }

    return this.json(
      {
        error: "Not Found",
        message: "Unknown account storage endpoint."
      },
      404
    );
  }

  private async handleRegister(request: Request) {
    const payload = await this.readJson<RegisterPayload>(request);
    const fullName = normalizeText(payload.fullName);
    const email = normalizeEmail(payload.email);
    const phone = normalizeText(payload.phone);
    const password = normalizeText(payload.password);

    if (!fullName || !email || !phone || !password) {
      return this.json(
        {
          error: "Bad Request",
          message: "fullName, email, phone, and password are required."
        },
        400
      );
    }

    if (await this.findMemberByEmail(email)) {
      return this.json(
        {
          error: "Conflict",
          message: "這個電子郵件已經註冊過。"
        },
        409
      );
    }

    const member: StoredMemberRecord = {
      id: `member-${crypto.randomUUID()}`,
      fullName,
      email,
      phone,
      joinedAt: new Date().toISOString(),
      defaultAddress: null,
      passwordHash: await hashPassword(password)
    };

    await this.saveMember(member);
    return this.createSessionResponse(member);
  }

  private async handleLogin(request: Request) {
    const payload = await this.readJson<LoginPayload>(request);
    const email = normalizeEmail(payload.email);
    const password = normalizeText(payload.password);

    if (!email || !password) {
      return this.json(
        {
          error: "Bad Request",
          message: "email and password are required."
        },
        400
      );
    }

    const member = await this.findMemberByEmail(email);
    if (!member) {
      return this.json(
        {
          error: "Unauthorized",
          message: "找不到這個會員帳號。"
        },
        401
      );
    }

    if (member.passwordHash !== (await hashPassword(password))) {
      return this.json(
        {
          error: "Unauthorized",
          message: "密碼不正確。"
        },
        401
      );
    }

    return this.createSessionResponse(member);
  }

  private async handleLogout(request: Request) {
    const sessionId = readCookie(request.headers.get("Cookie"), SESSION_COOKIE_NAME);

    if (sessionId) {
      await this.state.storage.delete(this.sessionKey(sessionId));
    }

    return this.json(
      {
        member: null
      },
      200,
      {
        "Set-Cookie": buildClearedSessionCookie()
      }
    );
  }

  private async handleGetCurrentMember(request: Request) {
    const member = await this.readCurrentMember(request);
    return this.json({ member: this.sanitizeMember(member) }, 200);
  }

  private async handleUpdateCurrentMember(request: Request) {
    const member = await this.readCurrentMember(request);
    if (!member) {
      return this.json(
        {
          error: "Unauthorized",
          message: "請先登入會員。"
        },
        401
      );
    }

    const payload = await this.readJson<UpdateMemberPayload>(request);
    const nextMember: StoredMemberRecord = {
      ...member,
      fullName: normalizeText(payload.fullName) || member.fullName,
      phone: normalizeText(payload.phone) || member.phone,
      defaultAddress: normalizeAddress({
        ...member.defaultAddress,
        ...payload.defaultAddress
      })
    };

    await this.saveMember(nextMember);
    return this.json({ member: this.sanitizeMember(nextMember) }, 200);
  }

  private async handleListMembers(request: Request) {
    const admin = await this.requireAdmin(request);
    if (admin instanceof Response) {
      return admin;
    }

    const members = await this.listMembers();

    return this.json(
      {
        members: members.map((member) => this.sanitizeMember(member))
      },
      200
    );
  }

  private async handleManageMember(request: Request) {
    const admin = await this.requireAdmin(request);
    if (admin instanceof Response) {
      return admin;
    }

    const payload = await this.readJson<RegisterPayload>(request);
    const fullName = normalizeText(payload.fullName);
    const email = normalizeEmail(payload.email);
    const phone = normalizeText(payload.phone);
    const password = normalizeText(payload.password);

    if (!fullName || !email || !phone || !password) {
      return this.json(
        {
          error: "Bad Request",
          message: "fullName, email, phone, and password are required."
        },
        400
      );
    }

    const existingMember = await this.findMemberByEmail(email);
    const nextMember: StoredMemberRecord = existingMember
      ? {
          ...existingMember,
          fullName,
          email,
          phone,
          passwordHash: await hashPassword(password)
        }
      : {
          id: `member-${crypto.randomUUID()}`,
          fullName,
          email,
          phone,
          joinedAt: new Date().toISOString(),
          defaultAddress: null,
          passwordHash: await hashPassword(password)
        };

    await this.saveMember(nextMember);

    return this.json(
      {
        created: !existingMember,
        member: this.sanitizeMember(nextMember)
      },
      200
    );
  }

  private async readCurrentMember(request: Request) {
    const sessionId = readCookie(request.headers.get("Cookie"), SESSION_COOKIE_NAME);
    if (!sessionId) {
      return null;
    }

    const session = await this.state.storage.get<SessionRecord>(this.sessionKey(sessionId));
    if (!session) {
      return null;
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await this.state.storage.delete(this.sessionKey(sessionId));
      return null;
    }

    return (
      (await this.state.storage.get<StoredMemberRecord>(
        this.memberKey(session.memberId)
      )) || null
    );
  }

  private async createSessionResponse(member: StoredMemberRecord) {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

    await this.state.storage.put(this.sessionKey(sessionId), {
      memberId: member.id,
      expiresAt
    } satisfies SessionRecord);

    return this.json(
      {
        member: this.sanitizeMember(member)
      },
      200,
      {
        "Set-Cookie": buildSessionCookie(sessionId)
      }
    );
  }

  private async listMembers() {
    const memberIds = (await this.state.storage.get<string[]>(MEMBER_INDEX_KEY)) || [];
    const memberRecords = await Promise.all(
      memberIds.map((memberId) =>
        this.state.storage.get<StoredMemberRecord>(this.memberKey(memberId))
      )
    );

    return memberRecords
      .filter((member): member is StoredMemberRecord => Boolean(member))
      .sort((left, right) => right.joinedAt.localeCompare(left.joinedAt));
  }

  private async requireAdmin(request: Request): Promise<StoredMemberRecord | Response> {
    const member = await this.readCurrentMember(request);
    if (!member) {
      return this.json(
        {
          error: "Unauthorized",
          message: "請先登入管理員會員。"
        },
        401
      );
    }

    if (!this.isAdminEmail(member.email)) {
      return this.json(
        {
          error: "Forbidden",
          message: "這個帳號沒有會員管理權限。"
        },
        403
      );
    }

    return member;
  }

  private async findMemberByEmail(email: string) {
    const memberId = await this.state.storage.get<string>(this.emailKey(email));
    if (!memberId) {
      return null;
    }

    return (
      (await this.state.storage.get<StoredMemberRecord>(this.memberKey(memberId))) || null
    );
  }

  private async saveMember(member: StoredMemberRecord) {
    await this.state.storage.put(this.memberKey(member.id), member);
    await this.state.storage.put(this.emailKey(member.email), member.id);
    const memberIds = (await this.state.storage.get<string[]>(MEMBER_INDEX_KEY)) || [];

    if (!memberIds.includes(member.id)) {
      memberIds.push(member.id);
      await this.state.storage.put(MEMBER_INDEX_KEY, memberIds);
    }
  }

  private sanitizeMember(member: StoredMemberRecord | null): MemberProfile | null {
    if (!member) {
      return null;
    }

    return {
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      joinedAt: member.joinedAt,
      defaultAddress: normalizeAddress(member.defaultAddress),
      isAdmin: this.isAdminEmail(member.email)
    };
  }

  private isAdminEmail(email: string) {
    return this.adminEmails.has(normalizeEmail(email));
  }

  private memberKey(memberId: string) {
    return `member:${memberId}`;
  }

  private emailKey(email: string) {
    return `member-email:${email}`;
  }

  private sessionKey(sessionId: string) {
    return `session:${sessionId}`;
  }

  private async readJson<T>(request: Request): Promise<T> {
    try {
      return (await request.json()) as T;
    } catch {
      return {} as T;
    }
  }

  private json(payload: unknown, status = 200, headers?: HeadersInit) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        ...headers
      }
    });
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeAddress(
  value: Partial<MemberDefaultAddress> | MemberDefaultAddress | null | undefined
): MemberDefaultAddress | null {
  if (!value) {
    return null;
  }

  const address: MemberDefaultAddress = {
    recipient: normalizeText(value.recipient),
    addressLine1: normalizeText(value.addressLine1),
    addressLine2: normalizeText(value.addressLine2),
    city: normalizeText(value.city),
    district: normalizeText(value.district),
    postalCode: normalizeText(value.postalCode)
  };

  return address.recipient || address.addressLine1 || address.city || address.district
    ? address
    : null;
}

async function hashPassword(password: string) {
  const encoded = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return "";
  }

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [cookieName, ...cookieValueParts] = cookie.trim().split("=");
    if (cookieName === name) {
      return decodeURIComponent(cookieValueParts.join("="));
    }
  }

  return "";
}

function buildSessionCookie(sessionId: string) {
  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
    "Secure"
  ].join("; ");
}

function buildClearedSessionCookie() {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
    "Secure"
  ].join("; ");
}

function resolveAdminMemberEmails(env: Env) {
  const configuredEmails = (env.ADMIN_MEMBER_EMAILS || "coryma@gmail.com")
    .split(",")
    .map((value) => normalizeEmail(value))
    .filter(Boolean);

  return new Set(configuredEmails);
}
